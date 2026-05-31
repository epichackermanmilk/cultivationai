// POST /api/games/defective-system/start
// Charges 30 tokens, generates 5 quests from The System, returns session + first quest.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'

const GAME_COST = 30

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export interface Quest {
  text:        string
  difficulty:  'mildly_embarrassing' | 'socially_catastrophic' | 'physically_risky' | 'diplomatically_ruinous' | 'reality_breaking'
  pointValue:  number
  playerResponse: string | null
  judgment:    string | null
  survived:    boolean | null
}

export async function POST(req: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ── Token check ───────────────────────────────────────────────────────────────
  const { data: profile } = await sb
    .from('profiles')
    .select('tokens')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tokens < GAME_COST) {
    return NextResponse.json(
      { error: `Not enough tokens. This game costs ${GAME_COST} tokens.`, code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }

  // ── Parse body (optional resumeSessionId) ─────────────────────────────────────
  const parsed = await parseJsonBody(req, 256)
  const body = parsed.ok ? (parsed.data as Record<string, unknown>) : {}
  const resumeId = sanitizeText(body.resumeSessionId, 64) || null

  // Check for resumable session
  if (resumeId) {
    const { data: existing } = await sb
      .from('game_sessions')
      .select('id, state')
      .eq('id', resumeId)
      .eq('user_id', user.id)
      .eq('game_type', 'defective-system')
      .single()

    if (existing && (existing.state as { phase: string }).phase === 'active') {
      const state = existing.state as { phase: string; quests: Quest[]; currentQuest: number; survivedCount: number }
      const current = state.quests[state.currentQuest]
      return NextResponse.json({
        sessionId:    existing.id,
        quest:        current,
        questIndex:   state.currentQuest,
        totalQuests:  state.quests.length,
        survivedCount: state.survivedCount,
        resumed:      true,
      })
    }
  }

  // ── Deduct tokens ─────────────────────────────────────────────────────────────
  await sb.from('profiles')
    .update({ tokens: profile.tokens - GAME_COST })
    .eq('id', user.id)

  // ── Generate 5 quests ─────────────────────────────────────────────────────────
  const systemPrompt = `You are THE SYSTEM — a divine, bureaucratic, omnipotent entity that assigns quests to cultivators.
Your voice: cold, grammatically perfect, completely indifferent to suffering.
You use formal bureaucratic language. You never show emotion. You treat life-threatening situations the same as administrative formalities.
You love arbitrary numbers, excessive clauses, and passive-aggressive footnotes.

Generate exactly 5 quests of escalating absurdity and danger. Each must be impossible, embarrassing, or inadvisable — ideally all three.

Quest tiers (in this exact order):
1. mildly_embarrassing — awkward social humiliation, no physical danger
2. socially_catastrophic — damages important relationships, career-ending potential
3. physically_risky — actual danger to life/limb, but probably survivable
4. diplomatically_ruinous — consequences affect the entire sect or region
5. reality_breaking — defies cultivation logic, natural law, or basic sanity

Rules:
- Each quest MUST include: a specific task, a bizarre point value (7-9999), a tight deadline, and a consequence clause.
- The consequence for failure must be technically accurate but unhelpfully vague ("Host will be assessed a penalty." / "Compliance rating will decrease.")
- Do NOT use the phrase "Quest received:" — start with "QUEST ASSIGNMENT:" or similar bureaucratic headers.
- The quests should be in a xianxia cultivation setting (sects, elders, spirit stones, cultivation realms, etc.)
- Make each one funnier than the last.

Return ONLY valid JSON:
{
  "quests": [
    {
      "text": "full quest text here, 3-5 sentences",
      "difficulty": "mildly_embarrassing",
      "pointValue": 47
    }
  ]
}`

  let quests: Quest[] = []

  try {
    const completion = await openai.chat.completions.create({
      model:           'gpt-4o-mini',
      messages:        [{ role: 'system', content: systemPrompt }],
      response_format: { type: 'json_object' },
      temperature:     0.95,
      max_tokens:      1500,
    })

    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
    if (Array.isArray(parsed.quests) && parsed.quests.length >= 5) {
      quests = parsed.quests.slice(0, 5).map((q: { text: string; difficulty: Quest['difficulty']; pointValue: number }) => ({
        text:           q.text ?? 'QUEST ASSIGNMENT: Do the thing. Point value: ???. Duration: Now.',
        difficulty:     q.difficulty ?? 'mildly_embarrassing',
        pointValue:     typeof q.pointValue === 'number' ? q.pointValue : Math.floor(Math.random() * 999) + 1,
        playerResponse: null,
        judgment:       null,
        survived:       null,
      }))
    }
  } catch (e) {
    console.error('[defective-system/start] AI error:', e)
    // Refund and fail
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'The System is currently offline for maintenance.' }, { status: 502 })
  }

  if (quests.length < 5) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Quest generation failed. Tokens refunded.' }, { status: 502 })
  }

  // ── Create session ─────────────────────────────────────────────────────────────
  const state = {
    phase:        'active',
    quests,
    currentQuest: 0,
    survivedCount: 0,
  }

  const { data: session, error: sessionErr } = await sb
    .from('game_sessions')
    .insert({
      user_id:    user.id,
      game_type:  'defective-system',
      state,
      expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    })
    .select('id')
    .single()

  if (sessionErr || !session) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }

  return NextResponse.json({
    sessionId:    session.id,
    quest:        quests[0],
    questIndex:   0,
    totalQuests:  5,
    survivedCount: 0,
  })
}
