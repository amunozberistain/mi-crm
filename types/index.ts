export type Deal = {
  id: string
  title: string
  stage: string
  value: number
  last_activity_at: string
  created_at: string
  contact_id: string | null
  contacts: {
    name: string
    company: string | null
  } | null
  proposal_url: string | null
  proposal_generated_at: string | null
  budget_url: string | null
  budget_generated_at: string | null
  cantidad_videos: number | null
  forma_pago: string | null
  notes: string | null
  budget_draft: Record<string, unknown> | null
  proposal_content: Record<string, unknown> | null
  // Workspace — invoicing
  invoice_paid: boolean
  invoice_paid_at: string | null
  invoice_amount: number | null
}

export type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  source: string | null
  notes: string | null
  created_at: string
  // Workspace — delivery tracking
  videos_delivered: boolean
  // Origen del lead (Meta Ads tracking)
  lead_source: 'manual' | 'meta_lead_ads' | 'meta_landing' | null
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  utm_term: string | null
  fbclid: string | null
  meta_form_id: string | null
  meta_ad_id: string | null
  meta_adset_id: string | null
  meta_campaign_id: string | null
}

export type Activity = {
  id: string
  user_id: string
  title: string
  description: string | null
  start_at: string
  end_at: string
  color: string
  deal_id: string | null
  contact_id: string | null
  source: 'manual' | 'google'
  google_event_id: string | null
  created_at: string
}

export type GoogleCalendarEvent = {
  id: string
  title: string
  start_at: string
  end_at: string
  is_all_day: boolean
  html_link: string | null
}

export type Expense = {
  id: string
  user_id: string
  concept: string
  category: string
  amount: number
  date: string
  created_at: string
  recurring: boolean
  recurring_frequency: string | null   // 'monthly' | 'quarterly' | 'yearly'
  recurring_parent_id: string | null
}
