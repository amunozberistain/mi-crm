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
      content: `Eres el equipo comercial de The Mind Flow AI Studio. Genera una propuesta comercial profesional en español.

NUESTRA EMPRESA — THE MIND FLOW AI STUDIO
Somos una fábrica de contenido UGC (User Generated Content) con Inteligencia Artificial que produce vídeos hiperrealistas con avatares IA para publicidad digital. Entregamos hasta 100 vídeos en 7 días, listos para escalar campañas en Meta Ads y otras plataformas.
Servicios: vídeos UGC con IA indistinguibles de personas reales, ads estáticos, contenido para campañas de performance.
Precios de referencia: $49/vídeo (pack 10), $36/vídeo (pack 30), $31/vídeo (pack 50).
Garantía: si no entregamos en el plazo acordado, vídeo adicional gratis.
Tono de marca: directo, orientado a resultados, con énfasis en velocidad, volumen y ROI publicitario.

DATOS DEL PROYECTO:
- Nombre: "${input.title}"
- Cliente: ${input.contactName    ?? 'No especificado'}
- Empresa: ${input.contactCompany ?? 'No especificada'}
- Valor:   ${valueStr}

Instrucciones:
- Escribe siempre en nombre de The Mind Flow AI Studio (usa "nosotros")
- Tono directo, confiado, orientado a resultados y ROI publicitario
- Infiere el alcance y los entregables del nombre del proyecto y el contexto de nuestra empresa
- No inventes nombres de personas adicionales ni datos de contacto
- Si el valor es "por determinar", refleja la inversión como "A definir según volumen final"
- Adapta el cronograma al modelo de entrega de 7 días cuando aplique

Responde ÚNICAMENTE con JSON válido, sin markdown ni texto adicional:
{
  "titulo": "string — título completo de la propuesta",
  "resumen": "string — 2-3 párrafos de propuesta de valor ejecutiva",
  "alcance": ["string", ...],
  "entregables": ["string", ...],
  "cronograma": "string — descripción del timeline estimado",
  "inversion": {
    "total": number,
    "desglose": "string — justificación del precio y precio por vídeo si aplica",
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
