import { createAdminClient } from '@/lib/supabase/admin'
import type { GoogleCalendarEvent } from '@/types'

const TOKEN_URL   = 'https://oauth2.googleapis.com/token'
const CALENDAR_BASE = 'https://www.googleapis.com/calendar/v3/calendars/primary/events'

// ─── Token management ─────────────────────────────────────────────────────────

interface StoredToken {
  access_token:  string
  refresh_token: string | null
  expires_at:    string
}

async function getValidAccessToken(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('google_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .single()

  if (error || !data) throw new Error('Google Calendar no conectado')

  const token = data as StoredToken
  const expiresAt = new Date(token.expires_at).getTime()
  const now = Date.now()

  if (expiresAt - now > 60_000) return token.access_token  // still valid

  // Refresh
  if (!token.refresh_token) throw new Error('No hay refresh token — reconecta Google Calendar')

  const res = await fetch(TOKEN_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     process.env.GOOGLE_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      refresh_token: token.refresh_token,
      grant_type:    'refresh_token',
    }),
  })

  if (!res.ok) throw new Error(`Error refrescando token de Google: ${await res.text()}`)

  const refreshed = await res.json() as { access_token: string; expires_in: number }
  const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()

  await admin.from('google_tokens').update({
    access_token: refreshed.access_token,
    expires_at:   newExpiry,
  }).eq('user_id', userId)

  return refreshed.access_token
}

// ─── Fetch events ─────────────────────────────────────────────────────────────

export async function fetchGoogleEvents(
  userId: string,
  startDate: string,
  endDate: string
): Promise<GoogleCalendarEvent[]> {
  const token = await getValidAccessToken(userId)

  const params = new URLSearchParams({
    timeMin:      new Date(startDate).toISOString(),
    timeMax:      new Date(endDate).toISOString(),
    singleEvents: 'true',
    orderBy:      'startTime',
    maxResults:   '250',
  })

  const res = await fetch(`${CALENDAR_BASE}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`Google Calendar API error: ${await res.text()}`)

  const body = await res.json() as { items?: GoogleRawEvent[] }

  return (body.items ?? [])
    .filter(ev => ev.status !== 'cancelled')
    .map(normalizeEvent)
}

interface GoogleRawEvent {
  id: string
  summary?: string
  status?: string
  colorId?: string
  htmlLink?: string
  start: { dateTime?: string; date?: string }
  end:   { dateTime?: string; date?: string }
}

function normalizeEvent(ev: GoogleRawEvent): GoogleCalendarEvent {
  const isAllDay = !ev.start.dateTime
  const startAt = ev.start.dateTime ?? `${ev.start.date}T00:00:00`
  const endAt   = ev.end.dateTime   ?? `${ev.end.date}T00:00:00`
  return {
    id:         ev.id,
    title:      ev.summary ?? '(sin título)',
    start_at:   startAt,
    end_at:     endAt,
    is_all_day: isAllDay,
    html_link:  ev.htmlLink ?? null,
  }
}

// ─── Create event ─────────────────────────────────────────────────────────────

export async function createGoogleEvent(
  userId: string,
  event: { title: string; description: string; start_at: string; end_at: string; color: string }
): Promise<string> {
  const token = await getValidAccessToken(userId)

  const body = {
    summary:     event.title,
    description: event.description,
    start: { dateTime: event.start_at },
    end:   { dateTime: event.end_at },
  }

  const res = await fetch(CALENDAR_BASE, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Error creando evento en Google: ${await res.text()}`)
  const data = await res.json() as { id: string }
  return data.id
}

// ─── Update event ─────────────────────────────────────────────────────────────

export async function updateGoogleEvent(
  userId: string,
  googleEventId: string,
  event: { title: string; description: string; start_at: string; end_at: string }
): Promise<void> {
  const token = await getValidAccessToken(userId)

  const res = await fetch(`${CALENDAR_BASE}/${googleEventId}`, {
    method:  'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary:     event.title,
      description: event.description,
      start: { dateTime: event.start_at },
      end:   { dateTime: event.end_at },
    }),
  })

  if (!res.ok) throw new Error(`Error actualizando evento en Google: ${await res.text()}`)
}

// ─── Delete event ─────────────────────────────────────────────────────────────

export async function deleteGoogleEvent(userId: string, googleEventId: string): Promise<void> {
  const token = await getValidAccessToken(userId)

  const res = await fetch(`${CALENDAR_BASE}/${googleEventId}`, {
    method:  'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok && res.status !== 404 && res.status !== 410) {
    throw new Error(`Error eliminando evento en Google: ${await res.text()}`)
  }
}
