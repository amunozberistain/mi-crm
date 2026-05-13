import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchGoogleEvents } from '@/lib/google/calendar'

export async function GET(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { searchParams } = new URL(request.url)
  const start = searchParams.get('start')
  const end   = searchParams.get('end')

  if (!start || !end) {
    return new NextResponse('Parámetros start y end requeridos', { status: 400 })
  }

  try {
    const events = await fetchGoogleEvents(user.id, start, end)
    return NextResponse.json(events)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error'
    console.error('[google/events]', msg)
    return new NextResponse(msg, { status: 500 })
  }
}
