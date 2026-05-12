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
      content: `Analiza esta transcripción de reunión de ventas y extrae la información para generar un presupuesto profesional en español.

TRANSCRIPCIÓN:
${transcript}

Responde ÚNICAMENTE con un objeto JSON válido (sin markdown, sin explicaciones) con esta estructura exacta:
{
  "titulo": "título descriptivo del proyecto",
  "cliente": "nombre del cliente o empresa mencionada",
  "descripcion_proyecto": "descripción de 2-3 frases del proyecto y sus objetivos",
  "partidas": [
    {
      "concepto": "nombre corto de la partida",
      "descripcion": "descripción breve de en qué consiste",
      "cantidad": 1,
      "precio_unitario": 0
    }
  ],
  "plazo_estimado": "plazo mencionado o estimado razonablemente",
  "notas": "condiciones especiales, forma de pago, garantías u otras notas importantes"
}

Instrucciones:
- Si no se mencionan cifras concretas, infiere precios de mercado españoles razonables para el sector
- Desgrana el trabajo en partidas específicas y facturables (mínimo 3, máximo 10)
- Si no hay información suficiente para algún campo, usa una cadena vacía ("")
- Los precios deben ser números enteros en euros`,
    }],
  })

  const text = (message.content[0] as { type: string; text: string }).text
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  return JSON.parse(cleaned) as BudgetDraft
}
