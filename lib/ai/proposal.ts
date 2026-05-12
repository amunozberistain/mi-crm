import Anthropic from '@anthropic-ai/sdk'

export interface ProposalInput {
  title:          string
  contactName:    string | null
  contactCompany: string | null
  value:          number
  probability:    number
}

export interface ProposalContent {
  titulo:        string
  resumen:       string
  alcance:       string[]
  entregables:   string[]
  cronograma:    string
  inversion: {
    total:          number
    desglose:       string
    forma_de_pago:  string
  }
  condiciones:      string[]
  siguiente_paso:   string
}

// Genera el contenido estructurado de la propuesta usando Claude.
// El modelo devuelve JSON puro que usamos para construir el PDF.
export async function generateProposalContent(input: ProposalInput): Promise<ProposalContent> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const valueStr = input.value > 0
    ? `${new Intl.NumberFormat('es-ES').format(input.value)} €`
    : 'por determinar'

  const message = await client.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role:    'user',
      content: `Eres un consultor comercial senior. Genera una propuesta comercial profesional en español.

Datos del proyecto:
- Nombre: "${input.title}"
- Cliente: ${input.contactName    ?? 'No especificado'}
- Empresa: ${input.contactCompany ?? 'No especificada'}
- Valor:   ${valueStr}

Instrucciones:
- Tono profesional, confiado y orientado al valor
- Infiere el alcance y los entregables del nombre del proyecto
- Usa "nosotros" para la empresa que presta el servicio
- No inventes nombres de personas adicionales ni datos de contacto
- Si el valor es "por determinar", refleja la inversión como "A definir según alcance final"

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional:
{
  "titulo": "string — título completo de la propuesta",
  "resumen": "string — 2-3 párrafos de propuesta de valor ejecutiva",
  "alcance": ["string", ...],
  "entregables": ["string", ...],
  "cronograma": "string — descripción del timeline estimado",
  "inversion": {
    "total": number,
    "desglose": "string — justificación del precio",
    "forma_de_pago": "string"
  },
  "condiciones": ["string", ...],
  "siguiente_paso": "string — llamada a la acción para el cierre"
}`,
    }],
  })

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : ''

  // Eliminar posible markdown que el modelo incluya a veces
  const json = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')

  try {
    return JSON.parse(json) as ProposalContent
  } catch {
    throw new Error(`Claude devolvió JSON inválido: ${raw.substring(0, 300)}`)
  }
}
