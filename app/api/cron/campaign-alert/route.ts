// Cron diario (08:00 UTC). Vercel lo llama automáticamente según vercel.json.
// Flujo: obtiene métricas de Meta Graph API → cruza con datos reales del CRM
// → envía alerta por email si hay campañas con CTR alto pero baja conversión real.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { fetchCampaignInsights } from '@/lib/meta/graph-api'
import { sendCampaignAlert, type CampaignAlertRow } from '@/lib/email/alert'

// Umbrales de alerta. Ajustar según el sector / histórico de conversión.
const CTR_THRESHOLD_PCT    = 3    // CTR mayor que 3% = "alto" en Meta
const CONVERSION_THRESHOLD = 0.10 // conversión menor que 10% = "baja" en CRM

export async function GET(request: NextRequest) {
  // Seguridad: Vercel añade el header Authorization en producción.
  // En desarrollo, omitir la comprobación si CRON_SECRET no está definido.
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  // ── 1. Métricas de Meta (CTR, gasto por campaña, últimos 7 días) ──────────
  const metaCampaigns = await fetchCampaignInsights('last_7d')

  if (!metaCampaigns) {
    return NextResponse.json({
      status: 'skipped',
      reason: 'META_ACCESS_TOKEN o META_AD_ACCOUNT_ID no configurados',
    })
  }

  // ── 2. Datos de conversión real del CRM (Supabase) ────────────────────────
  const admin = createAdminClient()

  // Leads por campaña: agrupamos contactos por meta_campaign_id
  const { data: leadsData } = await admin
    .from('contacts')
    .select('meta_campaign_id')
    .not('meta_campaign_id', 'is', null)

  // Deals ganados: contamos cuántos tienen contacto con meta_campaign_id
  const { data: wonData } = await admin
    .from('deals')
    .select('contact_id, contacts(meta_campaign_id)')
    .eq('stage', 'Cerrado ganado')

  // Construir mapas campaign_id → count
  const leadsMap: Record<string, number> = {}
  for (const row of leadsData ?? []) {
    const id = row.meta_campaign_id as string
    leadsMap[id] = (leadsMap[id] ?? 0) + 1
  }

  const wonMap: Record<string, number> = {}
  for (const row of wonData ?? []) {
    const contact = (row.contacts as unknown) as { meta_campaign_id: string | null } | null
    const id = contact?.meta_campaign_id
    if (id) wonMap[id] = (wonMap[id] ?? 0) + 1
  }

  // ── 3. Cruzar y detectar desajustes ──────────────────────────────────────
  const alerts: CampaignAlertRow[] = []

  for (const campaign of metaCampaigns) {
    if (campaign.ctr <= CTR_THRESHOLD_PCT) continue  // CTR normal → sin alerta

    const leads = leadsMap[campaign.campaign_id] ?? 0
    const won   = wonMap[campaign.campaign_id]   ?? 0

    // Solo alertar si tenemos suficiente muestra (≥5 leads)
    if (leads < 5) continue

    const conversionRate = won / leads
    if (conversionRate < CONVERSION_THRESHOLD) {
      alerts.push({
        campaign_id:     campaign.campaign_id,
        campaign_name:   campaign.campaign_name,
        ctr:             campaign.ctr,
        spend:           campaign.spend,
        leads,
        won,
        conversion_rate: conversionRate,
      })
    }
  }

  // ── 4. Enviar alerta si hay campañas problemáticas ────────────────────────
  if (alerts.length > 0) {
    await sendCampaignAlert(alerts)
  }

  return NextResponse.json({
    status:  'ok',
    checked: metaCampaigns.length,
    alerts:  alerts.length,
    campaigns: alerts.map((a) => ({ name: a.campaign_name, ctr: a.ctr, conversion: a.conversion_rate })),
  })
}
