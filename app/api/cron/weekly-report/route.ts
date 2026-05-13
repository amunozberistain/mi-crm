// Cron cada lunes a las 07:00 UTC (≈ 8-9h España).
// Genera un informe de la semana anterior: deals ganados/perdidos,
// nuevos deals y estado actual del pipeline.

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendWeeklyReport, type WeeklyReportData } from '@/lib/email/weekly-report'
import { CLOSED_WON_STAGE, CLOSED_LOST_STAGE } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  // ── Rango de la semana pasada (lun 00:00 → dom 23:59 UTC) ─────────────────
  const now = new Date()
  // thisMonday = hoy a 00:00 UTC (el cron corre en lunes)
  const thisMonday = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
  const lastMonday = new Date(thisMonday.getTime() - 7 * 24 * 60 * 60 * 1000)
  const lastSunday  = new Date(thisMonday.getTime() - 1)   // domingo 23:59:59.999

  const admin = createAdminClient()

  // ── 1. Deals cerrados la semana pasada ────────────────────────────────────
  const { data: closedDeals } = await admin
    .from('deals')
    .select('id, title, stage, value, contacts(name, company)')
    .in('stage', [CLOSED_WON_STAGE, CLOSED_LOST_STAGE])
    .gte('last_activity_at', lastMonday.toISOString())
    .lte('last_activity_at', lastSunday.toISOString())

  const closedWon = (closedDeals ?? [])
    .filter(d => d.stage === CLOSED_WON_STAGE)
    .map(d => {
      const c = (d.contacts as unknown as { name: string | null; company: string | null } | null)
      return {
        id:      d.id as string,
        title:   d.title as string,
        value:   d.value as number | null,
        contact: c?.name ?? null,
      }
    })

  const closedLost = (closedDeals ?? [])
    .filter(d => d.stage === CLOSED_LOST_STAGE)
    .map(d => {
      const c = (d.contacts as unknown as { name: string | null } | null)
      return { id: d.id as string, title: d.title as string, contact: c?.name ?? null }
    })

  // ── 2. Deals nuevos la semana pasada ──────────────────────────────────────
  const { data: newDealsData } = await admin
    .from('deals')
    .select('id, title, stage, value')
    .gte('created_at', lastMonday.toISOString())
    .lte('created_at', lastSunday.toISOString())
    .order('created_at', { ascending: false })

  const newDeals = (newDealsData ?? []).map(d => ({
    id:    d.id as string,
    title: d.title as string,
    stage: d.stage as string,
    value: d.value as number | null,
  }))

  // ── 3. Pipeline activo actual ─────────────────────────────────────────────
  const { data: openDeals } = await admin
    .from('deals')
    .select('stage, value')
    .not('stage', 'in', `("${CLOSED_WON_STAGE}","${CLOSED_LOST_STAGE}")`)

  // Agrupar por etapa
  const stageMap: Record<string, { count: number; value: number }> = {}
  for (const d of openDeals ?? []) {
    const stage = d.stage as string
    if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 }
    stageMap[stage].count++
    stageMap[stage].value += (d.value as number) ?? 0
  }

  const pipeline = Object.entries(stageMap).map(([stage, s]) => ({
    stage,
    count: s.count,
    value: s.value,
  }))

  const totalOpen  = (openDeals ?? []).length
  const totalValue = (openDeals ?? []).reduce((s, d) => s + ((d.value as number) ?? 0), 0)

  // ── 4. Enviar ─────────────────────────────────────────────────────────────
  const reportData: WeeklyReportData = {
    weekStart:  lastMonday.toISOString(),
    weekEnd:    lastSunday.toISOString(),
    closedWon,
    closedLost,
    newDeals,
    pipeline,
    totalOpen,
    totalValue,
  }

  await sendWeeklyReport(reportData)

  return NextResponse.json({
    status:     'ok',
    week:       `${lastMonday.toISOString().slice(0, 10)} → ${lastSunday.toISOString().slice(0, 10)}`,
    won:        closedWon.length,
    lost:       closedLost.length,
    new_deals:  newDeals.length,
    open:       totalOpen,
    pipeline_value: totalValue,
  })
}
