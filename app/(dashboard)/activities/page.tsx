import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import ActivitiesClient from '@/components/activities/activities-client'
import type { Activity } from '@/types'

export default async function ActivitiesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Load current week's activities for SSR
  const now       = new Date()
  const dow       = now.getDay() === 0 ? 6 : now.getDay() - 1
  const weekStart = new Date(now)
  weekStart.setDate(now.getDate() - dow)
  weekStart.setHours(0, 0, 0, 0)
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekStart.getDate() + 6)
  weekEnd.setHours(23, 59, 59, 999)

  const { data: activities } = await supabase
    .from('activities')
    .select('*')
    .gte('start_at', weekStart.toISOString())
    .lte('start_at', weekEnd.toISOString())
    .order('start_at')

  // Check Google Calendar connection status
  let isGoogleConnected = false
  if (user) {
    const admin = createAdminClient()
    const { data } = await admin
      .from('google_tokens')
      .select('user_id')
      .eq('user_id', user.id)
      .single()
    isGoogleConnected = !!data
  }

  return (
    <ActivitiesClient
      initialActivities={(activities ?? []) as Activity[]}
      isGoogleConnected={isGoogleConnected}
    />
  )
}
