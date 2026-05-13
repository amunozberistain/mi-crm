import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const clientId    = process.env.GOOGLE_CLIENT_ID
  const appUrl      = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')
  const redirectUri = `${appUrl}/api/google/callback`

  if (!clientId)  return new NextResponse('GOOGLE_CLIENT_ID no configurado', { status: 500 })
  if (!appUrl)    return new NextResponse('NEXT_PUBLIC_APP_URL no configurado', { status: 500 })

  const params = new URLSearchParams({
    client_id:     clientId,
    redirect_uri:  redirectUri,
    response_type: 'code',
    scope:         'https://www.googleapis.com/auth/calendar.events',
    access_type:   'offline',
    prompt:        'consent',
    state:         user.id,   // CSRF: validamos en callback
  })

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  )
}
