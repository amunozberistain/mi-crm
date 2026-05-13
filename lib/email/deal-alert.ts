import { Resend } from 'resend'

export interface StalledDeal {
  id:           string
  title:        string
  stage:        string
  value:        number | null
  days_stalled: number
  last_activity: string | null   // ISO date string
  contact_name:  string | null
  contact_company: string | null
}

function formatEur(n: number | null) {
  if (!n) return '—'
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function formatDate(iso: string | null) {
  if (!iso) return 'Sin actividad'
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

function urgencyColor(days: number) {
  if (days >= 14) return '#dc2626'   // rojo
  return '#d97706'                   // naranja
}

export async function sendDealAlert(deals: StalledDeal[], thresholdDays: number) {
  const apiKey = process.env.RESEND_API_KEY
  const from   = process.env.RESEND_FROM_EMAIL
  const to     = process.env.ALERT_EMAIL_TO

  if (!apiKey || !from || !to) {
    console.warn('[deal-alert] Resend no configurado — alerta omitida')
    return
  }

  const resend = new Resend(apiKey)

  const rows = deals.map((d) => {
    const color = urgencyColor(d.days_stalled)
    const contact = [d.contact_name, d.contact_company].filter(Boolean).join(' · ') || '—'
    return `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb">
        <span style="font-weight:600;color:#111827">${d.title}</span>
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">
        ${d.stage}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;color:#6b7280;font-size:13px">
        ${contact}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#374151;font-size:13px">
        ${formatEur(d.value)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;color:#6b7280">
        ${formatDate(d.last_activity)}
      </td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:center">
        <span style="display:inline-block;background:${color}1a;color:${color};font-weight:700;font-size:13px;padding:2px 8px;border-radius:9999px">
          ${d.days_stalled}d
        </span>
      </td>
    </tr>`
  }).join('')

  const today = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  const totalValue = deals.reduce((acc, d) => acc + (d.value ?? 0), 0)

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb">
  <div style="max-width:700px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden">

    <!-- Header -->
    <div style="background:#1e1b4b;padding:28px 32px">
      <p style="margin:0;color:#a5b4fc;font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase">The Mind Flow AI Studio · CRM</p>
      <h1 style="margin:10px 0 4px;color:#fff;font-size:22px;font-weight:700">
        🔔 Deals sin movimiento
      </h1>
      <p style="margin:0;color:#c7d2fe;font-size:14px">${today}</p>
    </div>

    <!-- Resumen -->
    <div style="padding:24px 32px 0;display:flex;gap:24px">
      <div style="flex:1;background:#fef9f0;border:1px solid #fed7aa;border-radius:10px;padding:16px 20px;text-align:center">
        <p style="margin:0;font-size:28px;font-weight:800;color:#92400e">${deals.length}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#92400e;font-weight:600">deals parados +${thresholdDays}d</p>
      </div>
      <div style="flex:1;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px 20px;text-align:center">
        <p style="margin:0;font-size:28px;font-weight:800;color:#166534">${formatEur(totalValue)}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#166534;font-weight:600">valor total en riesgo</p>
      </div>
      <div style="flex:1;background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 20px;text-align:center">
        <p style="margin:0;font-size:28px;font-weight:800;color:#991b1b">${deals.filter(d => d.days_stalled >= 14).length}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#991b1b;font-weight:600">críticos (+14d)</p>
      </div>
    </div>

    <!-- Tabla -->
    <div style="padding:24px 32px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f8fafc">
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Deal</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Etapa</th>
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Contacto</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Valor</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Últ. actividad</th>
            <th style="padding:10px 12px;text-align:center;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb;font-size:12px;text-transform:uppercase;letter-spacing:.05em">Parado</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        Alerta automática generada por tu CRM · Umbral configurado: ${thresholdDays} días sin actividad
      </p>
    </div>
  </div>
</body>
</html>`

  const critical = deals.filter(d => d.days_stalled >= 14).length
  const subject = critical > 0
    ? `🔴 ${deals.length} deals parados — ${critical} críticos (>${14}d sin actividad)`
    : `🟠 ${deals.length} deal${deals.length !== 1 ? 's' : ''} sin movimiento (+${thresholdDays}d)`

  const { error } = await resend.emails.send({ from, to, subject, html })
  if (error) console.error('[deal-alert] Resend error:', error)
  else console.log(`[deal-alert] Email enviado a ${to} — ${deals.length} deals`)
}
