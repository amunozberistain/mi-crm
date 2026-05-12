import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'

const VERIFY_TOKEN = process.env.META_WEBHOOK_VERIFY_TOKEN!
const APP_SECRET   = process.env.META_APP_SECRET
const PAGE_TOKEN   = process.env.META_PAGE_ACCESS_TOKEN!

// ─── GET: Meta llama aquí para verificar que el webhook existe ───────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const mode      = searchParams.get('hub.mode')
  const token     = searchParams.get('hub.verify_token')
  const challenge = searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 })
  }
  return new NextResponse('Forbidden', { status: 403 })
}

// ─── POST: Meta envía el evento cuando alguien rellena un Lead Ad ────────────
export async function POST(request: NextRequest) {
  const rawBody = await request.text()

  // Verificar firma HMAC si APP_SECRET está configurado
  if (APP_SECRET) {
    const sig      = request.headers.get('x-hub-signature-256') ?? ''
    const expected = 'sha256=' + crypto.createHmac('sha256', APP_SECRET).update(rawBody).digest('hex')
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      return new NextResponse('Invalid signature', { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(rawBody)
  } catch {
    return new NextResponse('Bad JSON', { status: 400 })
  }

  // Procesar cada evento de tipo "leadgen"
  for (const entry of (body.entry as unknown[]) ?? []) {
    const e = entry as { changes?: unknown[] }
    for (const change of e.changes ?? []) {
      const c = change as { field: string; value: Record<string, string> }
      if (c.field !== 'leadgen') continue

      const { leadgen_id, form_id, ad_id, adset_id, campaign_id } = c.value

      const leadData = await fetchMetaLead(leadgen_id)
      if (!leadData) continue

      await createContactFromLead(leadData, { form_id, ad_id, adset_id, campaign_id })
    }
  }

  return NextResponse.json({ status: 'ok' })
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function fetchMetaLead(leadId: string) {
  const url = `https://graph.facebook.com/v21.0/${leadId}?fields=field_data&access_token=${PAGE_TOKEN}`
  const res = await fetch(url)
  if (!res.ok) {
    console.error('Meta Graph API error:', await res.text())
    return null
  }
  return res.json() as Promise<{ field_data: { name: string; values: string[] }[] }>
}

async function createContactFromLead(
  lead: { field_data: { name: string; values: string[] }[] },
  meta: { form_id: string; ad_id: string; adset_id: string; campaign_id: string }
) {
  // Normalizar campos del formulario de Meta
  // (los nombres varían según la configuración del formulario)
  const f = Object.fromEntries(lead.field_data.map(({ name, values }) => [name, values[0] ?? '']))

  const name =
    f.full_name ||
    [f.first_name, f.last_name].filter(Boolean).join(' ') ||
    f.name ||
    'Lead de Meta'

  const admin = createAdminClient()

  // Obtener el ID del único usuario del sistema
  const { data: { users } } = await admin.auth.admin.listUsers()
  const ownerId = users[0]?.id
  if (!ownerId) {
    console.error('Meta webhook: no hay usuario propietario en el sistema')
    return
  }

  const { error } = await admin.from('contacts').insert({
    name,
    email:            f.email || null,
    phone:            f.phone_number || f.phone || null,
    company:          f.company_name || f.company || null,
    lead_source:      'meta_lead_ads',
    utm_source:       'facebook',
    utm_medium:       'lead_ads',
    meta_form_id:     meta.form_id   || null,
    meta_ad_id:       meta.ad_id     || null,
    meta_adset_id:    meta.adset_id  || null,
    meta_campaign_id: meta.campaign_id || null,
    owner_id:         ownerId,
  })

  if (error) console.error('Error creando contacto desde Meta lead:', error.message)
}
