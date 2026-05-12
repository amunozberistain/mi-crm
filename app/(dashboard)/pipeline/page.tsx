import { createClient } from '@/lib/supabase/server'
import KanbanBoard from '@/components/pipeline/kanban-board'
import { PIPELINE_STAGES } from '@/lib/constants'
import type { Contact, Deal } from '@/types'

export default async function PipelinePage() {
  const supabase = createClient()

  // Pedimos deals y contactos en paralelo para no esperar dos veces
  const [{ data: deals }, { data: contacts }] = await Promise.all([
    supabase
      .from('deals')
      .select('id, title, stage, value, probability, last_activity_at, created_at, contact_id, contacts (name, company)')
      .order('created_at', { ascending: false }),
    supabase
      .from('contacts')
      .select('id, name, company')
      .order('name'),
  ])

  return (
    <div className="flex flex-col h-full">
      <KanbanBoard
        deals={(deals as unknown as Deal[]) ?? []}
        stages={[...PIPELINE_STAGES]}
        contacts={(contacts as Pick<Contact, 'id' | 'name' | 'company'>[]) ?? []}
      />
    </div>
  )
}
