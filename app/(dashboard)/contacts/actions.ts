'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateContact(
  contactId: string,
  data: {
    name: string
    email: string | null
    phone: string | null
    company: string | null
    source: string | null
    notes: string | null
  }
) {
  const supabase = createClient()
  const { error } = await supabase
    .from('contacts')
    .update(data)
    .eq('id', contactId)
  if (error) throw new Error(error.message)
  revalidatePath('/contacts')
}

export async function deleteContact(contactId: string) {
  const supabase = createClient()
  const { error } = await supabase.from('contacts').delete().eq('id', contactId)
  if (error) throw new Error(error.message)
  revalidatePath('/contacts')
}

export async function createContact(formData: FormData) {
  const supabase = createClient()

  const name = (formData.get('name') as string).trim()
  if (!name) throw new Error('El nombre es obligatorio')

  const { error } = await supabase.from('contacts').insert({
    name,
    email:   (formData.get('email')   as string).trim() || null,
    phone:   (formData.get('phone')   as string).trim() || null,
    company: (formData.get('company') as string).trim() || null,
    source:  (formData.get('source')  as string).trim() || null,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/contacts')
}
