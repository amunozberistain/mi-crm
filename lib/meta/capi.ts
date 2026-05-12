import crypto from 'crypto'

function sha256(value: string): string {
  return crypto.createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

interface CapiEvent {
  email: string | null
  phone: string | null
  value: number
  currency?: string
  orderId: string
}

// Envía un evento de conversión "Purchase" a Meta Conversions API.
// Hashea email y teléfono con SHA-256 antes de enviarlos (requerido por Meta).
export async function sendCapiConversion({ email, phone, value, currency = 'EUR', orderId }: CapiEvent) {
  const pixelId     = process.env.META_PIXEL_ID
  const accessToken = process.env.META_ACCESS_TOKEN

  if (!pixelId || !accessToken) {
    console.warn('Meta CAPI: META_PIXEL_ID o META_ACCESS_TOKEN no configurados, evento omitido')
    return
  }

  const userData: Record<string, string[]> = {}
  if (email) userData.em = [sha256(email)]
  if (phone) userData.ph = [sha256(phone.replace(/[\s\-().+]/g, ''))]

  const payload: Record<string, unknown> = {
    data: [{
      event_name:    'Purchase',
      event_time:    Math.floor(Date.now() / 1000),
      action_source: 'crm',
      user_data:     userData,
      custom_data:   { value, currency, order_id: orderId },
    }],
    access_token: accessToken,
  }

  // En entorno de test, añadir el código de prueba para ver el evento en Events Manager
  const testCode = process.env.META_TEST_EVENT_CODE
  if (testCode) payload.test_event_code = testCode

  const res = await fetch(`https://graph.facebook.com/v21.0/${pixelId}/events`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  })

  if (!res.ok) {
    console.error('Meta CAPI error:', await res.text())
  } else {
    console.log(`Meta CAPI: evento Purchase enviado para deal ${orderId}`)
  }
}
