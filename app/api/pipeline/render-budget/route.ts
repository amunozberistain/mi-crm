export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildBudgetPDF } from '@/lib/pdf/budget-template'
import type { BudgetDraft } from '@/lib/ai/budget'

export async function POST(request: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { dealId, draft, formaPago } = await request.json() as {
    dealId: string
    draft: BudgetDraft
    formaPago?: string | null
  }
  if (!dealId || !draft) return new NextResponse('dealId y draft requeridos', { status: 400 })

  try {
    const buffer = await buildBudgetPDF(draft, formaPago ?? null)
    const admin  = createAdminClient()

    const filename = `budgets/${dealId}/${Date.now()}.pdf`
    const { error: uploadErr } = await admin.storage
      .from('proposals')
      .upload(filename, buffer, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) throw new Error(uploadErr.message)

    const { data: { publicUrl } } = admin.storage.from('proposals').getPublicUrl(filename)

    await admin.from('deals').update({
      budget_url:          publicUrl,
      budget_generated_at: new Date().toISOString(),
    }).eq('id', dealId)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[render-budget]', err)
    return new NextResponse(
      err instanceof Error ? err.message : 'Error generando el PDF',
      { status: 500 }
    )
  }
}
