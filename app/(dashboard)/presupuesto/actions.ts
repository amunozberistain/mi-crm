'use server'

import { createClient } from '@/lib/supabase/server'
import { extractBudgetFromTranscript, type BudgetDraft } from '@/lib/ai/budget'
import { buildBudgetPDF } from '@/lib/pdf/budget-template'
import { createAdminClient } from '@/lib/supabase/admin'

export async function analyzeTranscript(transcript: string): Promise<BudgetDraft> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  return extractBudgetFromTranscript(transcript)
}

export async function generateBudgetPDF(draft: BudgetDraft): Promise<{ url: string }> {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')

  const buffer = await buildBudgetPDF(draft)
  const filename = `budgets/${Date.now()}.pdf`

  const admin = createAdminClient()
  const { error } = await admin.storage
    .from('proposals')
    .upload(filename, buffer, { contentType: 'application/pdf', upsert: true })

  if (error) throw new Error(`Error subiendo PDF: ${error.message}`)

  const { data: { publicUrl } } = admin.storage
    .from('proposals')
    .getPublicUrl(filename)

  return { url: publicUrl }
}
