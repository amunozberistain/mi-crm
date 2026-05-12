'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createDeal(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const title = (formData.get('title') as string).trim()
  if (!title) throw new Error('El título es obligatorio')

  const contact_id = (formData.get('contact_id') as string) || null
  const stage      = (formData.get('stage') as string) || 'Nuevo lead'
  const value      = parseFloat(formData.get('value') as string) || 0
  const probability = parseInt(formData.get('probability') as string) || 0

  const { error } = await supabase.from('deals').insert({
    title,
    contact_id: contact_id || null,
    stage,
    value,
    probability,
    owner_id: user.id,
    last_activity_at: new Date().toISOString(),
  })

  if (error) throw new Error(error.message)
  revalidatePath('/pipeline')
}

export async function updateDealStage(dealId: string, newStage: string) {
  const supabase = createClient()

  const { error } = await supabase
    .from('deals')
    .update({
      stage: newStage,
      last_activity_at: new Date().toISOString(),
    })
    .eq('id', dealId)

  if (error) throw new Error(error.message)

  // Invalida la caché de la página para que Next.js re-fetch los datos
  revalidatePath('/pipeline')
}
