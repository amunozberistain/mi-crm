'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { CLOSED_WON_STAGE } from '@/lib/constants'
import { sendCapiConversion } from '@/lib/meta/capi'
import { createStripeCustomerAndInvoices } from '@/lib/stripe'

export async function updateDeal(
  dealId: string,
  data: {
    title: string
    stage: string
    value: number
    contact_id: string | null
    cantidad_videos: number | null
    forma_pago: string | null
    notes: string | null
  }
) {
  const supabase = createClient()

  // Comprobamos la etapa anterior para detectar si es un nuevo cierre ganado
  const { data: prev } = await supabase
    .from('deals')
    .select('stage')
    .eq('id', dealId)
    .single()

  const { error } = await supabase
    .from('deals')
    .update({ ...data, last_activity_at: new Date().toISOString() })
    .eq('id', dealId)
  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')

  // Stripe sólo cuando el deal pasa AHORA a Cerrado ganado (no si ya lo estaba)
  if (data.stage === CLOSED_WON_STAGE && prev?.stage !== CLOSED_WON_STAGE) {
    void createStripeInvoiceForDeal(supabase, dealId)
  }
}

export async function deleteDeal(dealId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('deals').delete().eq('id', dealId)
  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')
}

export async function clearDealDocument(dealId: string, type: 'budget' | 'proposal') {
  const supabase = createClient()
  const field = type === 'budget'
    ? { budget_url: null, budget_generated_at: null }
    : { proposal_url: null, proposal_generated_at: null }
  const { error } = await supabase.from('deals').update(field).eq('id', dealId)
  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')
}

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

  // Al cerrar ganado: Meta CAPI + Stripe (fire-and-forget)
  if (newStage === CLOSED_WON_STAGE) {
    void sendCapiForDeal(supabase, dealId)
    void createStripeInvoiceForDeal(supabase, dealId)
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

async function createStripeInvoiceForDeal(
  supabase: ReturnType<typeof createClient>,
  dealId: string
) {
  if (!process.env.STRIPE_SECRET_KEY) return   // Stripe no configurado → saltar

  const { data: deal } = await supabase
    .from('deals')
    .select('id, title, value, forma_pago, contacts(name, email)')
    .eq('id', dealId)
    .single()

  if (!deal || !deal.value) return

  const contact = (deal.contacts as unknown) as { name: string | null; email: string | null } | null

  try {
    const result = await createStripeCustomerAndInvoices({
      dealTitle:    deal.title as string,
      dealValue:    deal.value as number,
      formaPago:    deal.forma_pago as string | null,
      contactName:  contact?.name  ?? null,
      contactEmail: contact?.email ?? null,
    })
    console.log(`[stripe] Deal ${dealId} → customer ${result.customerId}, facturas: ${result.invoiceIds.join(', ')}`)
  } catch (err) {
    console.error('[stripe] Error creando factura:', err)
  }
}
