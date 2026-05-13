import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code    = searchParams.get('code')
  const stateId = searchParams.get('state')
  const error   = searchParams.get('error')

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? '').replace(/\/$/, '')

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/activities?google_error=access_denied`)
  }

  // Verificar que el state coincide con el usuario autenticado
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.id !== stateId) {
    return NextResponse.redirect(`${appUrl}/activities?google_error=state_mismatch`)
  }

  // Intercambiar código por tokens
  const redirectUri = `${appUrl}/api/google/callback`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
    }),
  })

  if (!res.ok) {
    console.error('[google/callback] token exchange failed:', await res.text())
    return NextResponse.redirect(`${appUrl}/activities?google_error=token_exchange`)
  }

  const tokens = await res.json() as {
    access_token:  string
    refresh_token?: string
    expires_in:    number
  }

  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()

  // Guardar tokens en Supabase (upsert para reconexión)
  const admin = createAdminClient()
  await admin.from('google_tokens').upsert({
    user_id:       user.id,
    access_token:  tokens.access_token,
    refresh_token: tokens.refresh_token ?? null,
    expires_at:    expiresAt,
  }, { onConflict: 'user_id' })

  return NextResponse.redirect(`${appUrl}/activities?google_connected=1`)
}
