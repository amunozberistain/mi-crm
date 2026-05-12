// Por qué waitUntil y no fire-and-forget normal:
// Vercel mata la función serverless en cuanto devuelve la respuesta.
// waitUntil le dice a Vercel "mantén esta función viva hasta que termine esta promesa",
// aunque ya hayamos respondido 202 al cliente. Así Claude + PDF + Storage
// terminan en background sin bloquear el drag-and-drop del Kanban.

import { NextRequest, NextResponse } from 'next/server'
import { waitUntil } from '@vercel/functions'
import { createClient } from '@/lib/supabase/server'
import { generateProposalForDeal } from '@/lib/pipeline/generate-proposal'

export async function POST(request: NextRequest) {
  // Verificar sesión activa (el endpoint solo es accesible desde el CRM autenticado)
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { dealId } = await request.json() as { dealId: string }
  if (!dealId) return new NextResponse('dealId requerido', { status: 400 })

  // Responder 202 inmediatamente — el Kanban puede seguir funcionando
  // mientras el PDF se genera en background
  waitUntil(
    generateProposalForDeal(dealId).catch((err) => {
      console.error(`Error generando propuesta para deal ${dealId}:`, err)
    })
  )

  return NextResponse.json({ status: 'generating', dealId })
}
