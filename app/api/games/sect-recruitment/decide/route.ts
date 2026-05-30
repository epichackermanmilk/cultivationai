// POST /api/games/sect-recruitment/decide
// Records the elder's decision for the current applicant and advances to the next.

import { NextResponse } from 'next/server'
import { cookies }      from 'next/headers'
import { createClient } from '@supabase/supabase-js'
import { parseJsonBody, sanitizeText } from '@/lib/sanitize'
import type { Treatment } from '@/lib/games/archetypes'

const VALID_TREATMENTS: Treatment[] = ['well', 'ignored', 'poorly', 'expelled']

function admin() {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

export async function POST(req: Request) {
  const cookieStore = await cookies()
  const token = cookieStore.get('nc_session')?.value
  if (!token) return NextResponse.json({ error: 'Sign in to play' }, { status: 401 })

  const sb = admin()
  const { data: { user }, error: authErr } = await sb.auth.getUser(token)
  if (authErr || !user) return NextResponse.json({ error: 'Session expired' }, { status: 401 })

  const parsed = await parseJsonBody(req, 256)
  if (!parsed.ok) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const body = parsed.data as Record<string, unknown>
  const sessionId = sanitizeText(body.sessionId, 64)
  const decision  = sanitizeText(body.decision, 20) as Treatment

  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })
  if (!VALID_TREATMENTS.includes(decision)) {
    return NextResponse.json({ error: 'decision must be: well | ignored | poorly | expelled' }, { status: 400 })
  }

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
      archetypeId: string; displayName: string; age: number; hometown: string;
      appearance: string; background: string; cultivation: string; openingStatement: string;
      questionsAsked: number; affinity: number; decision: string | null;
      messages: { role: string; content: string }[]
    }>
  }

  if (state.phase !== 'interview') {
    return NextResponse.json({ error: 'Not in interview phase' }, { status: 400 })
  }

  const idx = state.currentIndex
  if (idx >= state.applicants.length) {
    return NextResponse.json({ error: 'No more applicants' }, { status: 400 })
  }

  // Record decision
  const updatedApplicants = [...state.applicants]
  updatedApplicants[idx] = { ...updatedApplicants[idx], decision }

  const nextIndex = idx + 1
  const allDone   = nextIndex >= state.applicants.length
  const newPhase  = allDone ? 'reveal' : 'interview'
  const newState  = { ...state, applicants: updatedApplicants, currentIndex: nextIndex, phase: newPhase }

  await sb.from('game_sessions').update({ state: newState }).eq('id', sessionId)

  if (allDone) {
    return NextResponse.json({ done: true, sessionId })
  }

  const next = updatedApplicants[nextIndex]
  return NextResponse.json({
    done: false,
    currentIndex: nextIndex,
    totalApplicants: state.applicants.length,
    applicant: {
      name:             next.displayName,
      age:              next.age,
      hometown:         next.hometown,
      appearance:       next.appearance,
      background:       next.background,
      cultivation:      next.cultivation,
      openingStatement: next.openingStatement,
    },
  })
}
