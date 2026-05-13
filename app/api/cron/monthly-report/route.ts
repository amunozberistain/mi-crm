// Cron el día 1 de cada mes a las 07:00 UTC (≈ 8-9h España).
// Recopila métricas del mes anterior, pide a Claude un análisis narrativo
// con insights accionables y envía el informe completo por email.

export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendMonthlyReport, type MonthlyMetrics } from '@/lib/email/monthly-report'
import { CLOSED_WON_STAGE, CLOSED_LOST_STAGE, PIPELINE_STAGES } from '@/lib/constants'

function monthName(date: Date) {
  return date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export async function GET(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = request.headers.get('authorization')
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse('Unauthorized', { status: 401 })
    }
  }

  // ── Rangos temporales ─────────────────────────────────────────────────────
  const now = new Date()
  // Primer día del mes actual (hoy cuando corre el cron)
  const thisMonthStart  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(),     1))
  // Primer día del mes pasado
  const lastMonthStart  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1))
  // Primer día de hace 2 meses (para comparación)
  const prevMonthStart  = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 1))
  const lastMonthEnd    = new Date(thisMonthStart.getTime() - 1)

  const admin = createAdminClient()

  // ── 1. Deals cerrados el mes pasado ───────────────────────────────────────
  const { data: closedLastMonth } = await admin
    .from('deals')
    .select('id, title, stage, value, contacts(name, company)')
    .in('stage', [CLOSED_WON_STAGE, CLOSED_LOST_STAGE])
    .gte('last_activity_at', lastMonthStart.toISOString())
    .lte('last_activity_at', lastMonthEnd.toISOString())

  const wonLastMonth  = (closedLastMonth ?? []).filter(d => d.stage === CLOSED_WON_STAGE)
  const lostLastMonth = (closedLastMonth ?? []).filter(d => d.stage === CLOSED_LOST_STAGE)
  const wonRevenue    = wonLastMonth.reduce((s, d) => s + ((d.value as number) ?? 0), 0)
  const totalClosed   = wonLastMonth.length + lostLastMonth.length
  const winRate       = totalClosed > 0 ? wonLastMonth.length / totalClosed : 0
  const avgDealValue  = wonLastMonth.length > 0 ? wonRevenue / wonLastMonth.length : 0

  // ── 2. Deals cerrados el mes anterior (para comparación) ──────────────────
  const prevMonthEnd = new Date(lastMonthStart.getTime() - 1)
  const { data: closedPrevMonth } = await admin
    .from('deals')
    .select('id, stage, value')
    .in('stage', [CLOSED_WON_STAGE, CLOSED_LOST_STAGE])
    .gte('last_activity_at', prevMonthStart.toISOString())
    .lte('last_activity_at', prevMonthEnd.toISOString())

  const wonPrev     = (closedPrevMonth ?? []).filter(d => d.stage === CLOSED_WON_STAGE)
  const lostPrev    = (closedPrevMonth ?? []).filter(d => d.stage === CLOSED_LOST_STAGE)
  const prevRevenue = wonPrev.reduce((s, d) => s + ((d.value as number) ?? 0), 0)

  // ── 3. Nuevos deals el mes pasado ─────────────────────────────────────────
  const { data: newDealsData } = await admin
    .from('deals')
    .select('id')
    .gte('created_at', lastMonthStart.toISOString())
    .lte('created_at', lastMonthEnd.toISOString())

  // ── 4. Pipeline activo hoy ────────────────────────────────────────────────
  const { data: openDeals } = await admin
    .from('deals')
    .select('stage, value')
    .not('stage', 'in', `("${CLOSED_WON_STAGE}","${CLOSED_LOST_STAGE}")`)

  const stageMap: Record<string, { count: number; value: number }> = {}
  for (const d of openDeals ?? []) {
    const stage = d.stage as string
    if (!stageMap[stage]) stageMap[stage] = { count: 0, value: 0 }
    stageMap[stage].count++
    stageMap[stage].value += (d.value as number) ?? 0
  }

  const activeStages = PIPELINE_STAGES.filter(s => s !== CLOSED_WON_STAGE && s !== CLOSED_LOST_STAGE)
  const byStage = activeStages
    .map(stage => ({ stage, ...(stageMap[stage] ?? { count: 0, value: 0 }) }))
    .filter(s => s.count > 0)

  const totalOpen  = (openDeals ?? []).length
  const totalValue = (openDeals ?? []).reduce((s, d) => s + ((d.value as number) ?? 0), 0)

  // ── 5. Llamada a Claude para el análisis narrativo ────────────────────────
  const wonNames = wonLastMonth
    .map(d => {
      const c = (d.contacts as unknown as { name: string | null } | null)
      return `- ${d.title as string} (${c?.name ?? 'sin contacto'}) · ${d.value ? '€' + d.value : 'sin valor'}`
    })
    .join('\n') || '(ninguno)'

  const lostNames = lostLastMonth
    .map(d => {
      const c = (d.contacts as unknown as { name: string | null } | null)
      return `- ${d.title as string} (${c?.name ?? 'sin contacto'})`
    })
    .join('\n') || '(ninguno)'

  const pipelineSummary = byStage
    .map(s => `- ${s.stage}: ${s.count} deals · €${s.value.toLocaleString('es-ES')}`)
    .join('\n') || '(pipeline vacío)'

  const dataContext = `
EMPRESA: The Mind Flow AI Studio — fábrica de contenido UGC con IA (vídeos con avatares para Meta Ads, TikTok, YouTube).

MES ANALIZADO: ${monthName(lastMonthStart)}

--- RESULTADOS DEL MES ---
Deals ganados: ${wonLastMonth.length}
Ingresos cerrados: €${wonRevenue.toLocaleString('es-ES')}
Deals perdidos: ${lostLastMonth.length}
Win rate: ${(winRate * 100).toFixed(0)}%
Ticket medio ganado: €${Math.round(avgDealValue).toLocaleString('es-ES')}
Deals nuevos captados: ${(newDealsData ?? []).length}

Deals ganados en detalle:
${wonNames}

Deals perdidos en detalle:
${lostNames}

--- COMPARATIVA CON MES ANTERIOR (${monthName(prevMonthStart)}) ---
Deals ganados: ${wonPrev.length}
Ingresos: €${prevRevenue.toLocaleString('es-ES')}
Deals perdidos: ${lostPrev.length}

--- PIPELINE ACTUAL (inicio del nuevo mes) ---
Total deals abiertos: ${totalOpen} · Valor total: €${totalValue.toLocaleString('es-ES')}
${pipelineSummary}
`.trim()

  let aiAnalysis = ''
  try {
    const client = new Anthropic()
    const msg = await client.messages.create({
      model:      'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{
        role:    'user',
        content: `Eres el analista de negocio de The Mind Flow AI Studio. Analiza estos datos del mes y genera un informe ejecutivo en español para la fundadora del negocio.

${dataContext}

Escribe el análisis en formato markdown ligero (usa ## para secciones, **negrita** para énfasis, guiones para listas). Incluye exactamente estas secciones:
## Resumen del mes
(2-3 frases con los resultados clave y tendencia respecto al mes anterior)

## Lo que funcionó bien
(máximo 3 puntos concretos basados en los datos)

## Áreas de atención
(máximo 3 puntos con observaciones sobre el pipeline, win rate o deals perdidos)

## 3 acciones para el próximo mes
(recomendaciones específicas y accionables basadas en los datos, no genéricas)

Sé directo, concreto y útil. Sin introducciones ni despedidas. Máximo 350 palabras.`,
      }],
    })

    aiAnalysis = (msg.content[0] as { type: string; text: string }).text
  } catch (err) {
    console.error('[monthly-report] Claude error:', err)
    aiAnalysis = 'El análisis IA no está disponible en este momento. Revisa los datos en el CRM.'
  }

  // ── 6. Enviar email ───────────────────────────────────────────────────────
  const metrics: MonthlyMetrics = {
    monthName:     monthName(lastMonthStart),
    prevMonth:     monthName(prevMonthStart),
    wonCount:      wonLastMonth.length,
    wonRevenue,
    lostCount:     lostLastMonth.length,
    winRate,
    newDeals:      (newDealsData ?? []).length,
    avgDealValue,
    prevWonCount:  wonPrev.length,
    prevWonRevenue: prevRevenue,
    prevLostCount: lostPrev.length,
    totalOpen,
    totalValue,
    byStage,
  }

  await sendMonthlyReport(metrics, aiAnalysis)

  return NextResponse.json({
    status:  'ok',
    month:   monthName(lastMonthStart),
    won:     wonLastMonth.length,
    revenue: wonRevenue,
    win_rate: winRate,
    open:    totalOpen,
  })
}
