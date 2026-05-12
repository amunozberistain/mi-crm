export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildProposalPDF } from '@/lib/pdf/proposal-template'
import type { ProposalContent } from '@/lib/ai/proposal'

export async function POST(request: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { dealId, content, dealTitle, contactName, contactCompany } = await request.json() as {
    dealId:         string
    content:        ProposalContent
    dealTitle:      string
    contactName:    string | null
    contactCompany: string | null
  }
  if (!dealId || !content) return new NextResponse('dealId y content requeridos', { status: 400 })

  try {
    const buffer = await buildProposalPDF({ data: content, dealTitle, contactName, contactCompany })
    const admin  = createAdminClient()

    const filename = `${dealId}/${Date.now()}.pdf`
    const { error: uploadErr } = await admin.storage
      .from('proposals')
      .upload(filename, buffer, { contentType: 'application/pdf', upsert: true })
    if (uploadErr) throw new Error(uploadErr.message)

    const { data: { publicUrl } } = admin.storage.from('proposals').getPublicUrl(filename)

    await admin.from('deals').update({
      proposal_url:          publicUrl,
      proposal_generated_at: new Date().toISOString(),
    }).eq('id', dealId)

    return NextResponse.json({ url: publicUrl })
  } catch (err) {
    console.error('[render-proposal]', err)
    return new NextResponse(
      err instanceof Error ? err.message : 'Error generando el PDF',
      { status: 500 }
    )
  }
}
