'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { createGoogleEvent, deleteGoogleEvent, updateGoogleEvent } from '@/lib/google/calendar'
import type { Activity } from '@/types'

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getActivities(start: string, end: string): Promise<Activity[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .gte('start_at', start)
    .lte('start_at', end)
    .order('start_at')
  if (error) throw new Error(error.message)
  return (data ?? []) as Activity[]
}

export async function getGoogleConnectionStatus(): Promise<boolean> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const admin = createAdminClient()
  const { data } = await admin.from('google_tokens').select('user_id').eq('user_id', user.id).single()
  return !!data
}

// ─── Create ───────────────────────────────────────────────────────────────────

export async function createActivity(input: {
  title:        string
  description:  string | null
  start_at:     string
  end_at:       string
  color:        string
  deal_id:      string | null
  contact_id:   string | null
  syncToGoogle: boolean
}): Promise<Activity> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const { syncToGoogle, ...fields } = input
  let google_event_id: string | null = null

  if (syncToGoogle) {
    try {
      google_event_id = await createGoogleEvent(user.id, {
        title:       fields.title,
        description: fields.description ?? '',
        start_at:    fields.start_at,
        end_at:      fields.end_at,
        color:       fields.color,
      })
    } catch (err) {
      console.error('[activities] Error creando evento en Google:', err)
    }
  }

  const { data, error } = await supabase
    .from('activities')
    .insert({ ...fields, user_id: user.id, source: 'manual', google_event_id })
    .select()
    .single()

  if (error) throw new Error(error.message)
  revalidatePath('/activities')
  return data as Activity
}

// ─── Update ───────────────────────────────────────────────────────────────────

export async function updateActivity(id: string, input: {
  title:       string
  description: string | null
  start_at:    string
  end_at:      string
  color:       string
}): Promise<void> {
  const supabase = createClient()

  // Fetch existing to check for google_event_id
  const { data: existing } = await supabase.from('activities').select('google_event_id, user_id').eq('id', id).single()

  const { error } = await supabase
    .from('activities')
    .update(input)
    .eq('id', id)
  if (error) throw new Error(error.message)

  if (existing?.google_event_id && existing?.user_id) {
    try {
      await updateGoogleEvent(existing.user_id as string, existing.google_event_id as string, {
        title:       input.title,
        description: input.description ?? '',
        start_at:    input.start_at,
        end_at:      input.end_at,
      })
    } catch (err) {
      console.error('[activities] Error actualizando evento en Google:', err)
    }
  }

  revalidatePath('/activities')
}

// ─── Delete ───────────────────────────────────────────────────────────────────

export async function deleteActivity(id: string): Promise<void> {
  const supabase = createClient()

  const { data: existing } = await supabase.from('activities').select('google_event_id, user_id').eq('id', id).single()

  const { error } = await supabase.from('activities').delete().eq('id', id)
  if (error) throw new Error(error.message)

  if (existing?.google_event_id && existing?.user_id) {
    try {
      await deleteGoogleEvent(existing.user_id as string, existing.google_event_id as string)
    } catch (err) {
      console.error('[activities] Error eliminando evento en Google:', err)
    }
  }

  revalidatePath('/activities')
}
