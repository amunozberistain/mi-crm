import { createClient } from '@/lib/supabase/server'
import { CLOSED_WON_STAGE } from '@/lib/constants'
import WorkspaceClient from '@/components/workspace/workspace-client'
import { generateRecurringExpenses } from './actions'
import type { Contact, Deal, Expense } from '@/types'

// Contacts enriched with their associated deals
export type ContactWithDeals = Contact & {
  deals: Array<{ id: string; cantidad_videos: number | null; stage: string }>
}

// Closed-won deals enriched with contact info
export type DealWithContact = Deal & {
  contacts: { id: string; name: string; company: string | null } | null
}

export default async function WorkspacePage() {
  const supabase = createClient()

  // Generate any missed recurring instances before fetching
  try { await generateRecurringExpenses() } catch { /* table may not exist yet */ }

  const [
    { data: rawContacts },
    { data: rawWonDeals },
    { data: rawExpenses },
  ] = await Promise.all([
    supabase
      .from('contacts')
      .select('*, deals(id, cantidad_videos, stage)')
      .order('created_at', { ascending: false }),
    supabase
      .from('deals')
      .select('*, contacts(id, name, company)')
      .eq('stage', CLOSED_WON_STAGE)
      .order('created_at', { ascending: false }),
    supabase
      .from('expenses')
      .select('*')
      .order('date', { ascending: false }),
  ])

  return (
    <WorkspaceClient
      initialContacts={(rawContacts ?? []) as unknown as ContactWithDeals[]}
      initialWonDeals={(rawWonDeals ?? []) as unknown as DealWithContact[]}
      initialExpenses={(rawExpenses ?? []) as Expense[]}
    />
  )
}
