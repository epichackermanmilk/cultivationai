// Setup endpoint has been decommissioned — all DB tables exist.
// Returns 404 so no sensitive operations are exposed on production.
import { NextResponse } from 'next/server'
export async function GET() {
  return NextResponse.json({ error: 'Not found' }, { status: 404 })
}
