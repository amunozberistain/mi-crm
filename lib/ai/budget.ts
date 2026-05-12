import Anthropic from '@anthropic-ai/sdk'

export type BudgetDraft = {
  titulo: string
  cliente: string
  descripcion_proyecto: string
  partidas: Array<{
    concepto: string
    descripcion: string
    cantidad: number
    precio_unitario: number
  }>
  plazo_estimado: string
  notas: string
}

export async function extractBudgetFromTranscript(transcript: string): Promise<BudgetDraft> {
  const client = new Anthropic()

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    messages: [{
      role: 'user',
      content: `Eres el equipo comercial de The Mind Flow AI Studio. Analiza esta transcripción de reunión de ventas y genera un presupuesto profesional en español.

NUESTRA EMPRESA — THE MIND FLOW AI STUDIO
Somos una fábrica de contenido UGC con Inteligencia Artificial. Producimos vídeos hiperrealistas con avatares IA para publicidad digital (Meta Ads, TikTok, YouTube).
Precios de referencia: $49/vídeo (pack 10 vídeos = $490), $36/vídeo (pack 30 = $1.080), $31/vídeo (pack 50 = $1.550).
Entrega: hasta 100 vídeos en 7 días. Garantía de entrega en plazo.
Servicios: vídeos UGC con IA, hooks múltiples por vídeo, variaciones A/B, ads estáticos, guiones optimizados para conversión.

TRANSCRIPCIÓN DE LA REUNIÓN:
${transcript}

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "titulo": "título descriptivo del proyecto",
  "cliente": "nombre del cliente o empresa mencionada",
  "descripcion_proyecto": "descripción de 2-3 frases del proyecto y sus objetivos de negocio",
  "partidas": [
    {
      "concepto": "nombre corto de la partida",
      "descripcion": "descripción breve de en qué consiste",
      "cantidad": 1,
      "precio_unitario": 0
    }
  ],
  "plazo_estimado": "plazo mencionado o nuestro estándar de 7 días",
  "notas": "condiciones especiales, forma de pago, garantías u otras notas importantes"
}

Instrucciones:
- Usa los precios de The Mind Flow como referencia si no se mencionan cifras concretas
- Desgrana el trabajo en partidas específicas: vídeos UGC, hooks, variaciones, guiones, etc.
- Mínimo 2 partidas, máximo 8
- Los precios son en dólares USD (enteros)
- Si no hay información suficiente para un campo, usa cadena vacía ("")`,
    }],
  })

  const text = (message.content[0] as { type: string; text: string }).text
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as BudgetDraft
}
