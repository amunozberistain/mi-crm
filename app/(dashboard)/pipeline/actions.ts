'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CLOSED_WON_STAGE } from '@/lib/constants'
import { sendCapiConversion } from '@/lib/meta/capi'

export async function createDeal(formData: FormData) {
  const supabase = createClient()

  const title = (formData.get('title') as string).trim()
  if (!title) throw new Error('El título es obligatorio')

  const contact_id      = (formData.get('contact_id') as string) || null
  const stage           = (formData.get('stage') as string) || 'Nuevo lead'
  const value           = parseFloat(formData.get('value') as string) || 0
  const cantidad_videos = parseInt(formData.get('cantidad_videos') as string) || null
  const forma_pago      = (formData.get('forma_pago') as string) || null

  const { error } = await supabase.from('deals').insert({
    title,
    contact_id: contact_id || null,
    stage,
    value,
    cantidad_videos,
    forma_pago,
    last_activity_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')
}

export async function updateDealStage(dealId: string, newStage: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('deals')
    .update({ stage: newStage, last_activity_at: new Date().toISOString() })
    .eq('id', dealId)

  if (error) throw new Error(error.message)

  revalidatePath('/pipeline')

  // Al cerrar ganado: enviar evento de conversión a Meta CAPI (fire-and-forget)
  if (newStage === CLOSED_WON_STAGE) {
    void sendCapiForDeal(supabase, dealId)
  }
}

async function sendCapiForDeal(
  supabase: ReturnType<typeof createClient>,
  dealId: string
) {
  const { data: deal } = await supabase
    .from('deals')
    .select('id, value, contacts(email, phone)')
    .eq('id', dealId)
    .single()

  if (!deal) return

  const contact = (deal.contacts as unknown) as { email: string | null; phone: string | null } | null

  await sendCapiConversion({
    email:   contact?.email ?? null,
    phone:   contact?.phone ?? null,
    value:   (deal.value as number) ?? 0,
    orderId: deal.id as string,
  })
}
