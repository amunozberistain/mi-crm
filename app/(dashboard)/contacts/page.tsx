import { createClient } from '@/lib/supabase/server'
import ContactsClient from '@/components/contacts/contacts-client'
import type { Contact } from '@/types'

export default async function ContactsPage() {
  const supabase = createClient()

  const { data: contacts, error } = await supabase
    .from('contacts')
    .select('id, name, email, phone, company, source, created_at, lead_source, utm_campaign, utm_source, meta_campaign_id')
    .order('created_at', { ascending: false })

  if (error) console.error('Error fetching contacts:', error.message)

  return (
    <ContactsClient contacts={(contacts as Contact[]) ?? []} />
  )
}
