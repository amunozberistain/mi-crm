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
}

export type Activity = {
  id: string
  deal_id: string | null
  contact_id: string | null
  type: 'llamada' | 'email' | 'reunión' | 'nota' | 'tarea'
  notes: string | null
  created_at: string
}
