// Cron diario (07:00 UTC ≈ 8-9h en España).
// Detecta deals activos sin movimiento en N días y envía resumen por email.
// N se configura con DEAL_INACTIVITY_DAYS (por defecto 7).

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendDealAlert, type StalledDeal } from '@/lib/email/deal-alert'
import { CLOSED_WON_STAGE, CLOSED_LOST_STAGE } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  const thresholdDays = parseInt(process.env.DEAL_INACTIVITY_DAYS ?? '7', 10)
  const admin = createAdminClient()

  // Traemos todos los deals abiertos con datos del contacto
  const { data: deals, error } = await admin
    .from('deals')
    .select('id, title, stage, value, last_activity_at, created_at, contacts(name, company)')
    .not('stage', 'in', `("${CLOSED_WON_STAGE}","${CLOSED_LOST_STAGE}")`)
    .order('last_activity_at', { ascending: true, nullsFirst: true })

  if (error) {
    console.error('[deal-alert] Supabase error:', error)
    return new NextResponse(error.message, { status: 500 })
  }

  const now = Date.now()
  const msPerDay = 24 * 60 * 60 * 1000

  const stalled: StalledDeal[] = (deals ?? [])
    .map((d) => {
      // Usamos last_activity_at si existe, si no la fecha de creación
      const refDate = d.last_activity_at ?? d.created_at
      const daysSince = Math.floor((now - new Date(refDate as string).getTime()) / msPerDay)
      const contact = (d.contacts as unknown as { name: string | null; company: string | null } | null)
      return {
        id:              d.id as string,
        title:           d.title as string,
        stage:           d.stage as string,
        value:           d.value as number | null,
        days_stalled:    daysSince,
        last_activity:   d.last_activity_at as string | null,
        contact_name:    contact?.name    ?? null,
        contact_company: contact?.company ?? null,
      }
    })
    .filter((d) => d.days_stalled >= thresholdDays)
    .sort((a, b) => b.days_stalled - a.days_stalled)

  if (stalled.length === 0) {
    console.log(`[deal-alert] Sin deals parados (umbral: ${thresholdDays}d)`)
    return NextResponse.json({ status: 'ok', stalled: 0 })
  }

  await sendDealAlert(stalled, thresholdDays)

  return NextResponse.json({
    status:  'ok',
    stalled: stalled.length,
    deals:   stalled.map((d) => ({ title: d.title, days: d.days_stalled })),
  })
}
