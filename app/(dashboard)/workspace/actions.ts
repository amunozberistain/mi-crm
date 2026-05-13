'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Contacts ──────────────────────────────────────────────────────────────────

export async function updateContactDelivery(contactId: string, delivered: boolean) {
  const supabase = createClient()
  const { error } = await supabase
    .from('contacts')
    .update({ videos_delivered: delivered })
    .eq('id', contactId)
  if (error) throw new Error(error.message)
  revalidatePath('/workspace')
}

// ── Billing ───────────────────────────────────────────────────────────────────

export async function updateInvoice(dealId: string, data: {
  invoice_amount?: number | null
  invoice_paid?: boolean
  invoice_paid_at?: string | null
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('deals')
    .update(data)
    .eq('id', dealId)
  if (error) throw new Error(error.message)
  revalidatePath('/workspace')
}

// ── Expenses ──────────────────────────────────────────────────────────────────

export async function createExpense(data: {
  concept: string
  category: string
  amount: number
  date: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  const { error } = await supabase
    .from('expenses')
    .insert({ ...data, user_id: user.id })
  if (error) throw new Error(error.message)
  revalidatePath('/workspace')
}

export async function updateExpense(id: string, data: {
  concept?: string
  category?: string
  amount?: number
  date?: string
}) {
  const supabase = createClient()
  const { error } = await supabase
    .from('expenses')
    .update(data)
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/workspace')
}

export async function deleteExpense(id: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/workspace')
}
