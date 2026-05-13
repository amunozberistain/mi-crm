import { Resend } from 'resend'

export interface MonthlyMetrics {
  monthName:   string   // "mayo 2026"
  prevMonth:   string   // "abril 2026"

  // Mes actual
  wonCount:    number
  wonRevenue:  number
  lostCount:   number
  winRate:     number   // 0-1
  newDeals:    number
  avgDealValue: number

  // Mes anterior (para comparación)
  prevWonCount:   number
  prevWonRevenue: number
  prevLostCount:  number

  // Pipeline actual al día del informe
  totalOpen:   number
  totalValue:  number
  byStage:     { stage: string; count: number; value: number }[]
}

function eur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function pct(n: number) {
  return (n * 100).toFixed(0) + '%'
}

function delta(current: number, prev: number) {
  if (prev === 0) return ''
  const diff = current - prev
  const sign = diff >= 0 ? '+' : ''
  const color = diff >= 0 ? '#166534' : '#991b1b'
  return `<span style="font-size:11px;color:${color};margin-left:4px">(${sign}${diff})</span>`
}

function deltaEur(current: number, prev: number) {
  if (prev === 0) return ''
  const diff = current - prev
  const sign = diff >= 0 ? '+' : ''
  const color = diff >= 0 ? '#166534' : '#991b1b'
  return `<span style="font-size:11px;color:${color};margin-left:4px">(${sign}${eur(diff)})</span>`
}

// Convierte el texto plano de Claude a HTML: marca **negrita**, saltos de línea
function aiTextToHtml(text: string): string {
  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trim()
      if (!trimmed) return ''
      // Cabeceras marcadas con ### o ##
      if (trimmed.startsWith('### '))
        return `<h3 style="margin:20px 0 6px;font-size:14px;font-weight:700;color:#1e1b4b;text-transform:uppercase;letter-spacing:.04em">${trimmed.slice(4)}</h3>`
      if (trimmed.startsWith('## '))
        return `<h3 style="margin:20px 0 6px;font-size:14px;font-weight:700;color:#1e1b4b;text-transform:uppercase;letter-spacing:.04em">${trimmed.slice(3)}</h3>`
      // Listas con guión o asterisco
      if (/^[-*]\s/.test(trimmed))
        return `<li style="margin:4px 0;color:#374151;font-size:14px;line-height:1.6">${trimmed.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</li>`
      // Párrafo normal
      return `<p style="margin:6px 0;color:#374151;font-size:14px;line-height:1.7">${trimmed.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')}</p>`
    })
    .join('\n')
    // Agrupar <li> en <ul>
    .replace(/(<li[^>]*>[^<]*<\/li>\n?)+/g, (match) =>
      `<ul style="margin:8px 0 8px 16px;padding:0">${match}</ul>`
    )
}

export function buildMonthlyReportHtml(metrics: MonthlyMetrics, aiAnalysis: string): string {
  const today = new Date().toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })

  const stageRows = metrics.byStage.map(s => {
    const barPct = metrics.totalValue > 0 ? Math.round((s.value / metrics.totalValue) * 100) : 0
    return `
    <tr>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151">${s.stage}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:center;font-weight:600;color:#1e1b4b">${s.count}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6;text-align:right;font-size:13px;color:#374151">${eur(s.value)}</td>
      <td style="padding:9px 12px;border-bottom:1px solid #f3f4f6">
        <div style="background:#e5e7eb;border-radius:9999px;height:5px">
          <div style="background:#6366f1;height:5px;width:${barPct}%;border-radius:9999px"></div>
        </div>
      </td>
    </tr>`
  }).join('')

  return `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f3f4f6">
<div style="max-width:680px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#0f0f23 0%,#1e1b4b 60%,#312e81 100%);padding:32px 32px 28px">
    <p style="margin:0;color:#a5b4fc;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase">The Mind Flow AI Studio · CRM</p>
    <h1 style="margin:10px 0 4px;color:#fff;font-size:26px;font-weight:800">Resumen de ${metrics.monthName}</h1>
    <p style="margin:0;color:#c7d2fe;font-size:14px">Análisis generado con IA · ${today}</p>
  </div>

  <!-- KPIs comparativos -->
  <div style="padding:24px 24px 0">
    <table style="width:100%;border-collapse:collapse">
      <tr>
        <td style="padding:0 5px 0 0;width:25%">
          <div style="background:#f0fdf4;border-radius:10px;padding:14px 12px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:800;color:#166534;line-height:1">${metrics.wonCount} ${delta(metrics.wonCount, metrics.prevWonCount)}</p>
            <p style="margin:5px 0 0;font-size:11px;font-weight:600;color:#166534;text-transform:uppercase;letter-spacing:.04em">Ganados</p>
          </div>
        </td>
        <td style="padding:0 5px;width:30%">
          <div style="background:#eff6ff;border-radius:10px;padding:14px 12px;text-align:center">
            <p style="margin:0;font-size:20px;font-weight:800;color:#1d4ed8;line-height:1">${eur(metrics.wonRevenue)}</p>
            <p style="margin:2px 0 0;font-size:10px;color:#1d4ed8;opacity:.7">${deltaEur(metrics.wonRevenue, metrics.prevWonRevenue)}</p>
            <p style="margin:5px 0 0;font-size:11px;font-weight:600;color:#1d4ed8;text-transform:uppercase;letter-spacing:.04em">Ingresos</p>
          </div>
        </td>
        <td style="padding:0 5px;width:25%">
          <div style="background:#fdf4ff;border-radius:10px;padding:14px 12px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:800;color:#7e22ce;line-height:1">${pct(metrics.winRate)}</p>
            <p style="margin:5px 0 0;font-size:11px;font-weight:600;color:#7e22ce;text-transform:uppercase;letter-spacing:.04em">Win rate</p>
          </div>
        </td>
        <td style="padding:0 0 0 5px;width:20%">
          <div style="background:#fef9f0;border-radius:10px;padding:14px 12px;text-align:center">
            <p style="margin:0;font-size:24px;font-weight:800;color:#92400e;line-height:1">${metrics.newDeals}</p>
            <p style="margin:5px 0 0;font-size:11px;font-weight:600;color:#92400e;text-transform:uppercase;letter-spacing:.04em">Nuevos</p>
          </div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Análisis IA -->
  <div style="padding:28px 32px 0">
    <div style="background:#fafafa;border-left:3px solid #6366f1;border-radius:0 10px 10px 0;padding:20px 24px">
      <p style="margin:0 0 12px;font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase;letter-spacing:.08em">Análisis IA · Claude</p>
      ${aiTextToHtml(aiAnalysis)}
    </div>
  </div>

  <!-- Pipeline actual -->
  <div style="padding:28px 32px 0">
    <h2 style="margin:0 0 14px;font-size:15px;font-weight:700;color:#111827">
      📊 Pipeline al cierre del mes
      <span style="font-size:12px;font-weight:400;color:#6b7280;margin-left:6px">${metrics.totalOpen} deals · ${eur(metrics.totalValue)}</span>
    </h2>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="background:#f8fafc">
          <th style="padding:9px 12px;text-align:left;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #e5e7eb;width:38%">Etapa</th>
          <th style="padding:9px 12px;text-align:center;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #e5e7eb">Deals</th>
          <th style="padding:9px 12px;text-align:right;font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:.04em;border-bottom:2px solid #e5e7eb">Valor</th>
          <th style="padding:9px 12px;border-bottom:2px solid #e5e7eb;width:22%"></th>
        </tr>
      </thead>
      <tbody>${stageRows}</tbody>
    </table>
  </div>

  <!-- Footer -->
  <div style="margin:32px 0 0;padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
    <p style="margin:0;color:#9ca3af;font-size:12px">
      Informe mensual automático · The Mind Flow AI Studio CRM · ${metrics.monthName}
    </p>
  </div>

</div>
</body>
</html>`
}

export async function sendMonthlyReport(metrics: MonthlyMetrics, aiAnalysis: string) {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM_EMAIL
  const to     = process.env.ALERT_EMAIL_TO

  if (!apiKey || !from || !to) {
    console.warn('[monthly-report] Resend no configurado — informe omitido')
    return
  }

  const resend = new Resend(apiKey)
  const html   = buildMonthlyReportHtml(metrics, aiAnalysis)
  const subject = `📈 Resumen de ${metrics.monthName} — ${eur(metrics.wonRevenue)} cerrados · win rate ${pct(metrics.winRate)}`

  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) console.error('[monthly-report] Resend error:', error)
  else console.log(`[monthly-report] Enviado a ${to}`)
}
