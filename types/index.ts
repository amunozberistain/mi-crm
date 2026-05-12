export type Deal = {
  id: string
  title: string
  stage: string
  value: number
  probability: number
  last_activity_at: string
  created_at: string
  contact_id: string | null
  contacts: {
    name: string
    company: string | null
  } | null
}

export type Contact = {
  id: string
  name: string
  email: string | null
  phone: string | null
  company: string | null
  source: string | null
  created_at: string
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
  deal_id: string | null
  contact_id: string | null
  type: 'llamada' | 'email' | 'reunión' | 'nota' | 'tarea'
  notes: string | null
  created_at: string
}
