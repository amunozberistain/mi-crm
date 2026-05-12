import { createAdminClient } from '@/lib/supabase/admin'
import { extractBudgetFromTranscript } from '@/lib/ai/budget'
import { buildBudgetPDF } from '@/lib/pdf/budget-template'

const log = (dealId: string, msg: string) =>
  console.log(`[budget][${dealId}] ${new Date().toISOString()} — ${msg}`)

export async function generateBudgetForDeal(dealId: string, transcript: string): Promise<string> {
  log(dealId, 'INICIO')
  const admin = createAdminClient()

  // 1. Contexto del deal (título + contacto) para enriquecer el prompt
  const { data: deal, error } = await admin
    .from('deals')
    .select('id, title, cantidad_videos, forma_pago, contacts(name, company)')
    .eq('id', dealId)
    .single()

  if (error || !deal) {
    log(dealId, `ERROR al obtener deal: ${error?.message ?? 'no encontrado'}`)
    throw new Error(`Deal no encontrado: ${dealId}`)
  }
  log(dealId, `Deal: "${deal.title as string}"`)

  // 2. Claude extrae el presupuesto de la transcripción
  log(dealId, 'Llamando a Claude API…')
  const draft = await extractBudgetFromTranscript(transcript)
  log(dealId, `Claude respondió — "${draft.titulo}"`)

  // 3. Renderizar PDF
  log(dealId, 'Renderizando PDF…')
  const buffer = await buildBudgetPDF(draft, (deal as unknown as { forma_pago: string | null }).forma_pago)
  log(dealId, `PDF: ${buffer.length} bytes`)

  // 4. Subir a Supabase Storage (bucket "proposals", ruta budgets/{dealId}/…)
  log(dealId, 'Subiendo a Storage…')
  const filename = `budgets/${dealId}/${Date.now()}.pdf`
  const { error: uploadErr } = await admin.storage
    .from('proposals')
    .upload(filename, buffer, { contentType: 'application/pdf', upsert: true })

  if (uploadErr) {
    log(dealId, `ERROR upload: ${uploadErr.message}`)
    throw new Error(`Storage: ${uploadErr.message}`)
  }

  const { data: { publicUrl } } = admin.storage.from('proposals').getPublicUrl(filename)
  log(dealId, `Subida OK — ${publicUrl}`)

  // 5. Guardar URL en el deal
  const { error: updateErr } = await admin
    .from('deals')
    .update({ budget_url: publicUrl, budget_generated_at: new Date().toISOString() })
    .eq('id', dealId)

  if (updateErr) {
    log(dealId, `ERROR guardando URL: ${updateErr.message}`)
    throw new Error(`No se pudo guardar budget_url: ${updateErr.message}`)
  }

  log(dealId, 'FIN — presupuesto guardado correctamente')
  return publicUrl
}
