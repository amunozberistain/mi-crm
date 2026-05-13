import { Resend } from 'resend'
import { PIPELINE_STAGES } from '@/lib/constants'

export interface WeeklyReportData {
  weekStart:    string   // ISO date (lunes pasado)
  weekEnd:      string   // ISO date (domingo pasado)

  // Deals cerrados la semana pasada
  closedWon:    { id: string; title: string; value: number | null; contact: string | null }[]
  closedLost:   { id: string; title: string; contact: string | null }[]

  // Deals nuevos
  newDeals:     { id: string; title: string; stage: string; value: number | null }[]

  // Pipeline activo por etapa
  pipeline:     { stage: string; count: number; value: number }[]

  // Resumen global del pipeline activo
  totalOpen:    number
  totalValue:   number
}

// ─── Helpers de formato ──────────────────────────────────────────────────────

function eur(n: number | null) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function dateRange(start: string, end: string) {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: 'long' })
  return `${fmt(start)} – ${fmt(end)}`
}

// ─── Secciones del email ─────────────────────────────────────────────────────

function kpiCard(value: string, label: string, bg: string, fg: string) {
  return `
  <td style="width:25%;padding:0 6px">
    <div style="background:${bg};border-radius:10px;padding:16px 14px;text-align:center">
      <p style="margin:0;font-size:26px;font-weight:800;color:${fg};line-height:1">${value}</p>
      <p style="margin:5px 0 0;font-size:11px;font-weight:600;color:${fg};opacity:.75;text-transform:uppercase;letter-spacing:.05em">${label}</p>
    </div>
  </td>`
}

function closedWonRows(deals: WeeklyReportData['closedWon']) {
  if (deals.length === 0) return '<tr><td colspan="3" style="padding:14px 12px;color:#9ca3af;font-size:13px;text-align:center">Ningún deal ganado esta semana</td></tr>'
  return deals.map(d => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:600;color:#111827">${d.title}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">${d.contact ?? '—'}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:700;color:#166534">${eur(d.value)}</td>
    </tr>`).join('')
}

function pipelineRows(pipeline: WeeklyReportData['pipeline'], totalValue: number) {
  const activeStages = PIPELINE_STAGES.filter(s => s !== 'Cerrado ganado' && s !== 'Cerrado perdido')
  return activeStages.map(stage => {
    const row = pipeline.find(p => p.stage === stage)
    const count = row?.count ?? 0
    const value = row?.value ?? 0
    const pct = totalValue > 0 ? Math.round((value / totalValue) * 100) : 0
    return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#374151;font-size:13px">${stage}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-weight:600;color:#1e1b4b">${count}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;font-size:13px">${eur(value)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
        <div style="background:#e5e7eb;border-radius:9999px;height:6px;overflow:hidden">
          <div style="background:#4f46e5;height:6px;width:${pct}%;border-radius:9999px"></div>
        </div>
      </td>
    </tr>`
  }).join('')
}

// ─── Builder del HTML ────────────────────────────────────────────────────────

export function buildWeeklyReportHtml(d: WeeklyReportData): string {
  const wonRevenue = d.closedWon.reduce((s, x) => s + (x.value ?? 0), 0)
  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6">
<div style="max-width:680px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#1e1b4b 0%,#312e81 100%);padding:30px 32px">
    <p style="margin:0;color:#a5b4fc;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase">The Mind Flow AI Studio · CRM</p>
    <h1 style="margin:10px 0 4px;color:#fff;font-size:24px;font-weight:800">Informe semanal</h1>
    <p style="margin:0;color:#c7d2fe;font-size:14px">${dateRange(d.weekStart, d.weekEnd)} · ${today}</p>
  </div>

  <!-- KPIs -->
  <div style="padding:24px 26px 0">
    <table style="width:100%;border-spacing:0">
      <tr>
        ${kpiCard(String(d.closedWon.length),  'Deals ganados',  '#f0fdf4', '#166534')}
        ${kpiCard(eur(wonRevenue),              'Ingresos semana','#eff6ff', '#1d4ed8')}
        ${kpiCard(String(d.newDeals.length),    'Deals nuevos',   '#fef9f0', '#92400e')}
        ${kpiCard(String(d.closedLost.length),  'Deals perdidos', '#fef2f2', '#991b1b')}
      </tr>
    </table>
  </div>

  <!-- Deals ganados -->
  <div style="padding:28px 32px 0">
    <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827">
      ✅ Deals cerrados ganados
      <span style="font-size:12px;font-weight:500;color:#6b7280;margin-left:6px">${dateRange(d.weekStart, d.weekEnd)}</span>
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Deal</th>
          <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Contacto</th>
          <th style="padding:9px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Valor</th>
        </tr>
      </thead>
      <tbody>${closedWonRows(d.closedWon)}</tbody>
      ${wonRevenue > 0 ? `
      <tfoot>
        <tr style="background:#f0fdf4">
          <td colspan="2" style="padding:10px 12px;font-weight:700;color:#166534;font-size:13px">Total ingresos</td>
          <td style="padding:10px 12px;text-align:right;font-weight:800;color:#166534;font-size:15px">${eur(wonRevenue)}</td>
        </tr>
      </tfoot>` : ''}
    </table>
  </div>

  <!-- Pipeline actual -->
  <div style="padding:28px 32px 0">
    <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827">
      📊 Pipeline activo
      <span style="font-size:12px;font-weight:500;color:#6b7280;margin-left:6px">${d.totalOpen} deals · ${eur(d.totalValue)}</span>
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb;width:40%">Etapa</th>
          <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Deals</th>
          <th style="padding:9px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.05em;border-bottom:2px solid #e5e7eb">Valor</th>
          <th style="padding:9px 12px;border-bottom:2px solid #e5e7eb;width:25%"></th>
        </tr>
      </thead>
      <tbody>${pipelineRows(d.pipeline, d.totalValue)}</tbody>
    </table>
  </div>

  ${d.newDeals.length > 0 ? `
  <!-- Deals nuevos -->
  <div style="padding:28px 32px 0">
    <h2 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827">
      🆕 Deals creados esta semana
    </h2>
    <ul style="margin:0;padding:0;list-style:none">
      ${d.newDeals.map(d => `
      <li style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">
        <span style="font-weight:600">${d.title}</span>
        <span style="color:#9ca3af;margin:0 6px">·</span>
        <span style="color:#6b7280">${d.stage}</span>
        ${d.value ? `<span style="color:#9ca3af;margin:0 6px">·</span><span style="color:#4f46e5;font-weight:600">${eur(d.value)}</span>` : ''}
      </li>`).join('')}
    </ul>
  </div>` : ''}

  <!-- Footer -->
  <div style="margin:32px 0 0;padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#9ca3af;font-size:12px">
      Informe semanal automático · The Mind Flow AI Studio CRM
    </p>
  </div>

</div>
</body>
</html>`
}

// ─── Envío ───────────────────────────────────────────────────────────────────

export async function sendWeeklyReport(data: WeeklyReportData) {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM_EMAIL
  const to     = process.env.ALERT_EMAIL_TO

  if (!apiKey || !from || !to) {
    console.warn('[weekly-report] Resend no configurado — informe omitido')
    return
  }

  const resend = new Resend(apiKey)
  const html   = buildWeeklyReportHtml(data)
  const wonRevenue = data.closedWon.reduce((s, x) => s + (x.value ?? 0), 0)
  const subject = `📊 Informe semanal — ${data.closedWon.length} ganados · ${eur(wonRevenue)}`

  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) console.error('[weekly-report] Resend error:', error)
  else console.log(`[weekly-report] Enviado a ${to}`)
}
