// POST /api/games/sect-recruitment/start
// Charges 25 tokens, picks archetypes, generates all 8 applicant presentations via AI,
// stores session in Supabase, returns session + first applicant.
//
// Required Supabase table (run once):
// CREATE TABLE game_sessions (
//   id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
//   user_id      UUID REFERENCES auth.users(id) ON DELETE CASCADE,
//   game_type    TEXT NOT NULL,
//   state        JSONB NOT NULL DEFAULT '{}',
//   created_at   TIMESTAMPTZ DEFAULT now(),
//   expires_at   TIMESTAMPTZ DEFAULT (now() + INTERVAL '48 hours')
// );
// CREATE INDEX ON game_sessions(user_id, game_type);
// ALTER TABLE game_sessions ENABLE ROW LEVEL SECURITY;
// CREATE POLICY "users own their sessions" ON game_sessions
//   USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

import { NextResponse }   from 'next/server'
import { cookies }        from 'next/headers'
import { createClient }   from '@supabase/supabase-js'
import OpenAI             from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import { pickArchetypes, SECT_PRESETS, type Treatment } from '@/lib/games/archetypes'

const GAME_COST = 25

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  // ── Auth ───────────────────────────────────────────────────────────────────
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  // ── Parse body ─────────────────────────────────────────────────────────────
  const parsed = await parseJsonBody(req, 512)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>
  const presetId = sanitizeText(body.presetId, 40) ?? 'declining'

  const preset = SECT_PRESETS.find(p => p.id === presetId) ?? SECT_PRESETS[0]

  // ── Check & deduct tokens ──────────────────────────────────────────────────
  const { data: profile } = await sb
    .from('profiles')
    .select('tokens')
    .eq('id', user.id)
    .single()

  if (!profile || profile.tokens < GAME_COST) {
    return NextResponse.json(
      { error: `Not enough tokens — you need ${GAME_COST} tokens to begin recruitment.`, code: 'INSUFFICIENT_TOKENS' },
      { status: 402 },
    )
  }

  const { error: deductErr } = await sb
    .from('profiles')
    .update({ tokens: profile.tokens - GAME_COST })
    .eq('id', user.id)

  if (deductErr) return NextResponse.json({ error: 'Token deduction failed' }, { status: 500 })

  // ── Pick archetypes ────────────────────────────────────────────────────────
  const archetypes = pickArchetypes(preset, 8)

  // ── Generate all 8 disguised presentations in one AI call ─────────────────
  const archetypeDescriptions = archetypes.map((a, i) => ({
    index: i,
    hints: a.hints.join('; '),
  }))

  const systemPrompt = `You are the narrator of a cultivation sect recruitment game set in a xianxia/wuxia world.
Your job is to generate disguised applicant presentations for ${preset.name}.
Context: ${preset.flavor}

For each applicant, create a distinct individual. The hints describe who they truly are beneath the disguise — use them to write subtle tells into the presentation without making the archetype obvious.

Return ONLY valid JSON. No markdown. No explanation. Structure:
{
  "applicants": [
    {
      "index": 0,
      "name": "Full Name (traditional Chinese style)",
      "age": 14-25,
      "hometown": "a specific place name",
      "appearance": "2-3 sentences. Vivid, specific. Hide the hints here subtly.",
      "background": "3-4 sentences of backstory. Plausible. Contains subtle tells.",
      "cultivation": "Cultivation realm (e.g. Qi Condensation Stage 3) and spiritual root grade",
      "opening_statement": "1-3 sentences spoken directly to the interviewing elder. In character. Reveals personality."
    }
  ]
}`

  const userPrompt = `Generate 8 applicants for ${preset.name}.

Applicant hints (do NOT reveal these directly — weave them in subtly):
${archetypeDescriptions.map(a => `Applicant ${a.index}: ${a.hints}`).join('\n')}

Make each applicant feel like a real, distinct person. Vary their personalities, speech styles, and backgrounds significantly.`

  let applicantPresentations: Array<{
    index: number; name: string; age: number; hometown: string;
    appearance: string; background: string; cultivation: string; opening_statement: string
  }> = []

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.9,
    })
    const parsed = JSON.parse(completion.choices[0].message.content ?? '{}')
    applicantPresentations = parsed.applicants ?? []
  } catch (e) {
    // Refund tokens on AI failure
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    console.error('Sect recruitment AI error:', e)
    return NextResponse.json({ error: 'Failed to generate applicants — tokens refunded' }, { status: 500 })
  }

  // ── Build session state ────────────────────────────────────────────────────
  const sessionApplicants = archetypes.map((arch, i) => {
    const pres = applicantPresentations.find(p => p.index === i) ?? {
      name: `Applicant ${i + 1}`, age: 18, hometown: 'Unknown',
      appearance: '', background: '', cultivation: 'Qi Condensation Stage 1',
      opening_statement: 'I seek to join the sect.',
    }
    return {
      archetypeId:  arch.id,
      displayName:  pres.name,
      age:          pres.age,
      hometown:     pres.hometown,
      appearance:   pres.appearance,
      background:   pres.background,
      cultivation:  pres.cultivation,
      openingStatement: pres.opening_statement,
      questionsAsked: 0,
      affinity:     arch.baseAffinity,
      decision:     null as Treatment | null,
      messages:     [] as { role: 'user' | 'assistant'; content: string }[],
    }
  })

  const state = {
    phase:        'interview' as const,
    presetId:     preset.id,
    currentIndex: 0,
    applicants:   sessionApplicants,
    sectStats:    { ...preset.startingStats },
  }

  const { data: session, error: insertErr } = await sb
    .from('game_sessions')
    .insert({
      user_id:   user.id,
      game_type: 'sect-recruitment',
      state,
    })
    .select('id')
    .single()

  if (insertErr || !session) {
    await sb.from('profiles').update({ tokens: profile.tokens }).eq('id', user.id)
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 })
  }

  const first = sessionApplicants[0]
  return NextResponse.json({
    sessionId: session.id,
    preset: { id: preset.id, name: preset.name, tagline: preset.tagline },
    totalApplicants: sessionApplicants.length,
    currentIndex: 0,
    applicant: {
      name:             first.displayName,
      age:              first.age,
      hometown:         first.hometown,
      appearance:       first.appearance,
      background:       first.background,
      cultivation:      first.cultivation,
      openingStatement: first.openingStatement,
    },
    tokensRemaining: profile.tokens - GAME_COST,
  })
}
