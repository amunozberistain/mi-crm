export const maxDuration = 60

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generateProposalContent } from '@/lib/ai/proposal'

export async function POST(request: NextRequest) {
  const { data: { user } } = await createClient().auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const { dealId } = await request.json() as { dealId?: string }
  if (!dealId) return new NextResponse('dealId requerido', { status: 400 })

  const admin = createAdminClient()
  const { data: deal, error } = await admin
    .from('deals')
    .select('id, title, value, contacts(name, company)')
    .eq('id', dealId)
    .single()

  if (error || !deal) return new NextResponse('Deal no encontrado', { status: 404 })

  const contact = (deal.contacts as unknown) as { name: string; company: string | null } | null

  try {
    const content = await generateProposalContent({
      title:          deal.title    as string,
      contactName:    contact?.name    ?? null,
      contactCompany: contact?.company ?? null,
      value:          (deal.value as number) ?? 0,
      probability:    100,
    })
    return NextResponse.json({ content })
  } catch (err) {
    console.error('[extract-proposal]', err)
    return new NextResponse(
      err instanceof Error ? err.message : 'Error generando la propuesta',
      { status: 500 }
    )
  }
}
