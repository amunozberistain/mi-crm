'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createContact(formData: FormData) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const name = (formData.get('name') as string).trim()
  if (!name) throw new Error('El nombre es obligatorio')

  const { error } = await supabase.from('contacts').insert({
    name,
    email:   (formData.get('email')   as string).trim() || null,
    phone:   (formData.get('phone')   as string).trim() || null,
    company: (formData.get('company') as string).trim() || null,
    source:  (formData.get('source')  as string).trim() || null,
    owner_id: user.id,
  })

  if (error) throw new Error(error.message)
  revalidatePath('/contacts')
}
