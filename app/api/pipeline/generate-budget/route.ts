// Generación síncrona: esperamos a que Claude + PDF + Storage terminen
// y devolvemos la URL al cliente directamente — sin waitUntil.
// El modal muestra el spinner hasta recibir la respuesta (~15s).
export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { generateBudgetForDeal } from '@/lib/pipeline/generate-budget'

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { dealId, transcript } = await request.json() as { dealId?: string; transcript?: string }
  if (!dealId || !transcript?.trim()) {
    return new NextResponse('dealId y transcript requeridos', { status: 400 })
  }

  try {
    const url = await generateBudgetForDeal(dealId, transcript)
    return NextResponse.json({ url })
  } catch (err) {
    console.error('[generate-budget] ERROR:', err)
    return new NextResponse(
      err instanceof Error ? err.message : 'Error generando el presupuesto',
      { status: 500 }
    )
  }
}
