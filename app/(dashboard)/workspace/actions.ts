'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Helpers ───────────────────────────────────────────────────────────────────

function addPeriod(date: Date, frequency: string): Date {
  const d = new Date(date)
  if (frequency === 'monthly')   d.setMonth(d.getMonth() + 1)
  else if (frequency === 'quarterly') d.setMonth(d.getMonth() + 3)
  else if (frequency === 'yearly')    d.setFullYear(d.getFullYear() + 1)
  return d
}

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

// Called from page.tsx on every server render to catch up missed recurring instances.
export async function generateRecurringExpenses() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  const { data: parents } = await supabase
    .from('expenses')
    .select('*')
    .eq('user_id', user.id)
    .eq('recurring', true)
    .is('recurring_parent_id', null)

  if (!parents?.length) return

  const { data: children } = await supabase
    .from('expenses')
    .select('date, recurring_parent_id')
    .eq('user_id', user.id)
    .not('recurring_parent_id', 'is', null)

  const existingKeys = new Set(
    (children ?? []).map(c => `${c.recurring_parent_id}:${c.date}`)
  )

  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const toInsert: Record<string, unknown>[] = []

  for (const parent of parents) {
    if (!parent.recurring_frequency) continue
    let current = addPeriod(new Date(parent.date), parent.recurring_frequency)
    while (current <= today) {
      const dateStr = current.toISOString().slice(0, 10)
      if (!existingKeys.has(`${parent.id}:${dateStr}`)) {
        toInsert.push({
          user_id: parent.user_id,
          concept: parent.concept,
          category: parent.category,
          amount: parent.amount,
          date: dateStr,
          recurring: true,
          recurring_frequency: parent.recurring_frequency,
          recurring_parent_id: parent.id,
        })
      }
      current = addPeriod(current, parent.recurring_frequency)
    }
  }

  if (toInsert.length > 0) {
    await supabase.from('expenses').insert(toInsert)
  }
}

export async function createExpense(data: {
  concept: string
  category: string
  amount: number
  date: string
  recurring?: boolean
  recurring_frequency?: string
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { data: parent, error } = await supabase
    .from('expenses')
    .insert({
      concept:             data.concept,
      category:            data.category,
      amount:              data.amount,
      date:                data.date,
      user_id:             user.id,
      recurring:           data.recurring ?? false,
      recurring_frequency: data.recurring ? (data.recurring_frequency ?? null) : null,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Generate all instances from start date up to today
  if (data.recurring && data.recurring_frequency && parent) {
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    const instances: Record<string, unknown>[] = []
    let current = addPeriod(new Date(data.date), data.recurring_frequency)
    while (current <= today) {
      instances.push({
        user_id:             user.id,
        concept:             data.concept,
        category:            data.category,
        amount:              data.amount,
        date:                current.toISOString().slice(0, 10),
        recurring:           true,
        recurring_frequency: data.recurring_frequency,
        recurring_parent_id: parent.id,
      })
      current = addPeriod(current, data.recurring_frequency)
    }
    if (instances.length > 0) {
      await supabase.from('expenses').insert(instances)
    }
  }

  revalidatePath('/workspace')
}

export async function updateExpense(
  id: string,
  data: {
    concept?: string
    category?: string
    amount?: number
    date?: string
    recurring_frequency?: string
  },
  scope: 'this' | 'all_future' = 'this'
) {
  const supabase = createClient()

  if (scope === 'all_future') {
    const { data: row } = await supabase
      .from('expenses').select('recurring_parent_id').eq('id', id).single()
    const parentId = row?.recurring_parent_id ?? id
    const today = new Date().toISOString().slice(0, 10)

    await supabase.from('expenses').update(data).eq('id', parentId)

    if (data.recurring_frequency !== undefined) {
      // Frequency changed — delete future children; generateRecurringExpenses recreates them on next load
      await supabase.from('expenses').delete()
        .eq('recurring_parent_id', parentId).gte('date', today)
    } else {
      await supabase.from('expenses').update(data)
        .eq('recurring_parent_id', parentId).gte('date', today)
    }
  } else {
    await supabase.from('expenses').update(data).eq('id', id)
  }

  revalidatePath('/workspace')
}

export async function deleteExpense(id: string, scope: 'this' | 'all_future' = 'this') {
  const supabase = createClient()

  if (scope === 'all_future') {
    const { data: row } = await supabase
      .from('expenses').select('recurring_parent_id').eq('id', id).single()
    const parentId = row?.recurring_parent_id ?? id
    const today = new Date().toISOString().slice(0, 10)
    await supabase.from('expenses').delete().eq('id', parentId)
    await supabase.from('expenses').delete()
      .eq('recurring_parent_id', parentId).gte('date', today)
  } else {
    await supabase.from('expenses').delete().eq('id', id)
  }

  revalidatePath('/workspace')
}
