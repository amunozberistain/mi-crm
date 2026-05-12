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
  console.log('[proposal/route] POST recibido')

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[proposal/route] 401 — sin sesión')
    return new NextResponse('Unauthorized', { status: 401 })
  }
  console.log(`[proposal/route] Usuario autenticado: ${user.id}`)

  const body = await request.json() as { dealId?: string }
  const { dealId } = body
  if (!dealId) {
    console.log('[proposal/route] 400 — dealId ausente en body:', body)
    return new NextResponse('dealId requerido', { status: 400 })
  }
  console.log(`[proposal/route] dealId recibido: ${dealId}`)

  waitUntil(
    generateProposalForDeal(dealId)
      .catch((err: unknown) => {
        console.error(`[proposal/route] ERROR en background para deal ${dealId}:`, err)
        if (err instanceof Error) console.error('[proposal/route] Stack:', err.stack)
      })
  )

  console.log(`[proposal/route] waitUntil lanzado, respondiendo 200`)
  return NextResponse.json({ status: 'generating', dealId })
}
