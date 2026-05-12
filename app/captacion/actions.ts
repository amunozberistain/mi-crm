'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function submitCaptacionLead(formData: FormData) {
  const name = (formData.get('name') as string).trim()
  if (!name) throw new Error('El nombre es obligatorio')

  const admin = createAdminClient()

  // Obtener el ID del único usuario del sistema para asignar el lead
  const { data: { users }, error: usersError } = await admin.auth.admin.listUsers()
  if (usersError || !users.length) throw new Error('Error de configuración del sistema')
  const ownerId = users[0].id

  const getString = (key: string) => (formData.get(key) as string | null)?.trim() || null

  const { error } = await admin.from('contacts').insert({
    name,
    email:        getString('email'),
    phone:        getString('phone'),
    lead_source:  'meta_landing',
    utm_source:   getString('utm_source'),
    utm_medium:   getString('utm_medium'),
    utm_campaign: getString('utm_campaign'),
    utm_content:  getString('utm_content'),
    utm_term:     getString('utm_term'),
    fbclid:       getString('fbclid'),
    owner_id:     ownerId,
  })

  if (error) throw new Error(error.message)
}
