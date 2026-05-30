// POST /api/games/sect-recruitment/reveal
// Generates narrative reveal text for all 8 applicants and computes final sect state.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import OpenAI           from 'openai'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import {
  ARCHETYPES, SECT_PRESETS, calcSectOutcome,
  type Treatment,
} from '@/lib/games/archetypes'

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const parsed = await parseJsonBody(req, 256)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body      = parsed.data as Record<string, unknown>
  const sessionId = sanitizeText(body.sessionId, 64)
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const { data: row } = await sb
    .from('game_sessions')
    .select('id, user_id, state')
    .eq('id', sessionId)
    .eq('user_id', user.id)
    .single()

  if (!row) return NextResponse.json({ error: 'Session not found' }, { status: 404 })

  const state = row.state as {
    phase: string; presetId: string; currentIndex: number;
    applicants: Array<{
      archetypeId: string; displayName: string; age: number;
      decision: Treatment | null; questionsAsked: number;
    }>
  }

  if (state.phase !== 'reveal') {
    return NextResponse.json({ error: 'Not all decisions made yet' }, { status: 400 })
  }

  const preset = SECT_PRESETS.find(p => p.id === state.presetId) ?? SECT_PRESETS[0]

  // Build reveal data per applicant
  const revealInputs = state.applicants.map(a => {
    const arch      = ARCHETYPES.find(x => x.id === a.archetypeId)!
    const treatment = a.decision ?? 'ignored'
    const outcome   = arch.outcomes[treatment]
    return {
      displayName:   a.displayName,
      archetypeName: arch.name,
      archetypeId:   arch.id,
      treatment,
      template:      outcome.template,
      potential:     arch.potential,
      tells:         arch.tells,
      sectEffects:   outcome.sectEffects,
    }
  })

  // One AI call generates all 8 reveal narratives
  const systemPrompt = `You are the narrator of a xianxia cultivation sect game.
The player just finished interviewing 8 applicants for ${preset.name}.
Now reveal who each applicant truly was and what happened to them — and to the sect.

Write dramatically. Each reveal should feel like a chapter title drop.
Use past tense. Vary the emotional register (triumph, tragedy, irony, satisfaction).
Keep each narrative 2-4 sentences. Punchy. Memorable.

Return ONLY valid JSON:
{
  "reveals": [
    {
      "index": 0,
      "narrative": "string"
    }
  ]
}`

  const userPrompt = revealInputs.map((r, i) =>
    `[${i}] "${r.displayName}" was the ${r.archetypeName}. Elder's choice: ${r.treatment}.
Outcome template: ${r.template}`
  ).join('\n\n')

  let narratives: string[] = revealInputs.map(r => r.template)

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user',   content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.85,
    })
    const aiParsed = JSON.parse(completion.choices[0].message.content ?? '{}')
    if (Array.isArray(aiParsed.reveals)) {
      narratives = revealInputs.map((_, i) =>
        aiParsed.reveals.find((r: { index: number; narrative: string }) => r.index === i)?.narrative ?? revealInputs[i].template
      )
    }
  } catch (e) {
    console.error('Reveal AI error:', e)
    // Fall back to template narratives
  }

  // Compute final sect state
  const decisions = state.applicants.map(a => ({
    archetypeId: a.archetypeId,
    treatment:   a.decision ?? 'ignored',
  }))
  const sectOutcome = calcSectOutcome(decisions, preset)

  // Mark session complete
  await sb.from('game_sessions').update({
    state: { ...state, phase: 'complete' },
  }).eq('id', sessionId)

  return NextResponse.json({
    reveals: revealInputs.map((r, i) => ({
      displayName:   r.displayName,
      archetypeName: r.archetypeName,
      treatment:     r.treatment,
      narrative:     narratives[i],
      potential:     r.potential,
      tells:         r.tells,
      sectEffects:   r.sectEffects,
    })),
    sectOutcome,
    preset: { id: preset.id, name: preset.name },
  })
}
