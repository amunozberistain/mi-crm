import { Resend } from 'resend'

export interface CampaignAlertRow {
  campaign_id:    string
  campaign_name:  string
  ctr:            number   // % de Meta
  spend:          number
  leads:          number
  won:            number
  conversion_rate: number  // won / leads
}

function formatEur(n: number) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)
}

function formatPct(n: number) {
  return (n * 100).toFixed(1) + '%'
}

export async function sendCampaignAlert(campaigns: CampaignAlertRow[]) {
  const from   = process.env.RESEND_FROM_EMAIL
  const to     = process.env.ALERT_EMAIL_TO
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey || !from || !to) {
    console.warn('Resend: credenciales no configuradas, alerta omitida')
    return
  }

  const resend = new Resend(apiKey)

  const rows = campaigns.map((c) => `
    <tr>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;font-weight:500">${c.campaign_name}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;font-weight:600">${c.ctr.toFixed(2)}%</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${formatEur(c.spend)}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${c.leads}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right">${c.won}</td>
      <td style="padding:10px 12px;border-bottom:1px solid #e5e7eb;text-align:right;color:#dc2626;font-weight:600">${formatPct(c.conversion_rate)}</td>
    </tr>`).join('')

  const html = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb">
  <div style="max-width:680px;margin:40px auto;background:#fff;border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.1);overflow:hidden">

    <!-- Header -->
    <div style="background:#4f46e5;padding:28px 32px">
      <p style="margin:0;color:#c7d2fe;font-size:13px;font-weight:500;letter-spacing:.05em;text-transform:uppercase">CRM · Alerta automática</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:22px;font-weight:700">
        ⚠️ Campañas con alto CTR y baja conversión
      </h1>
    </div>

    <!-- Intro -->
    <div style="padding:28px 32px 0">
      <p style="margin:0;color:#374151;font-size:15px;line-height:1.6">
        Las siguientes campañas tienen un <strong>CTR elevado en Meta Ads</strong> pero una
        <strong>tasa de conversión real baja</strong> en el CRM. Puede indicar que el anuncio
        atrae clics pero el proceso de venta necesita revisión.
      </p>
    </div>

    <!-- Tabla -->
    <div style="padding:24px 32px">
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:10px 12px;text-align:left;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Campaña</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">CTR</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Gasto</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Leads</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Ganados</th>
            <th style="padding:10px 12px;text-align:right;font-weight:600;color:#374151;border-bottom:2px solid #e5e7eb">Conversión</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <!-- Footer -->
    <div style="padding:20px 32px;background:#f9fafb;border-top:1px solid #e5e7eb">
      <p style="margin:0;color:#9ca3af;font-size:12px">
        Alerta generada automáticamente por tu CRM · ${new Date().toLocaleDateString('es-ES', { day:'2-digit', month:'long', year:'numeric' })}
      </p>
    </div>
  </div>
</body>
</html>`

  const { error } = await resend.emails.send({
    from,
    to,
    subject: `⚠️ ${campaigns.length} campaña${campaigns.length !== 1 ? 's' : ''} con alto CTR y baja conversión`,
    html,
  })

  if (error) console.error('Resend error:', error)
  else console.log(`Alerta enviada a ${to} para ${campaigns.length} campaña(s)`)
}
