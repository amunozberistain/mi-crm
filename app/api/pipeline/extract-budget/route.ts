export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractBudgetFromTranscript } from '@/lib/ai/budget'

export async function POST(request: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { transcript } = await request.json() as { transcript?: string }
  if (!transcript?.trim()) return new NextResponse('transcript requerido', { status: 400 })

  try {
    const draft = await extractBudgetFromTranscript(transcript)
    return NextResponse.json({ draft })
  } catch (err) {
    console.error('[extract-budget]', err)
    return new NextResponse(
      err instanceof Error ? err.message : 'Error extrayendo el presupuesto',
      { status: 500 }
    )
  }
}
