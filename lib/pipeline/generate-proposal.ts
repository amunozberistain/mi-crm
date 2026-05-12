import { createAdminClient } from '@/lib/supabase/admin'
import { generateProposalContent } from '@/lib/ai/proposal'
import { buildProposalPDF } from '@/lib/pdf/proposal-template'
import { uploadProposalPDF } from '@/lib/storage/proposals'

const log = (dealId: string, msg: string) =>
  console.log(`[proposal][${dealId}] ${new Date().toISOString()} — ${msg}`)

export async function generateProposalForDeal(dealId: string): Promise<string> {
  log(dealId, 'INICIO')

  const admin = createAdminClient()
  log(dealId, 'Admin client creado')

  // 1. Datos del deal + contacto
  const { data: deal, error } = await admin
    .from('deals')
    .select('id, title, value, probability, contacts(name, company, email)')
    .eq('id', dealId)
    .single()

  if (error || !deal) {
    log(dealId, `ERROR al obtener deal: ${error?.message ?? 'no encontrado'}`)
    throw new Error(`Deal no encontrado: ${dealId}`)
  }
  log(dealId, `Deal obtenido: "${deal.title as string}" valor=${deal.value}`)

  const contact = (deal.contacts as unknown) as { name: string; company: string | null; email: string | null } | null
  log(dealId, `Contacto: ${contact?.name ?? 'sin contacto'} / ${contact?.company ?? 'sin empresa'}`)

  // 2. Claude genera el contenido estructurado
  log(dealId, 'Llamando a Claude API…')
  const content = await generateProposalContent({
    title:          deal.title    as string,
    contactName:    contact?.name    ?? null,
    contactCompany: contact?.company ?? null,
    value:          (deal.value as number)       ?? 0,
    probability:    (deal.probability as number) ?? 0,
  })
  log(dealId, `Claude respondió — título: "${content.titulo}"`)

  // 3. Renderizar PDF con @react-pdf/renderer
  log(dealId, 'Renderizando PDF…')
  const pdfBuffer = await buildProposalPDF({
    data:           content,
    dealTitle:      deal.title    as string,
    contactName:    contact?.name    ?? null,
    contactCompany: contact?.company ?? null,
  })
  log(dealId, `PDF renderizado — ${pdfBuffer.length} bytes`)

  // 4. Subir a Supabase Storage bucket "proposals"
  log(dealId, 'Subiendo a Supabase Storage…')
  const publicUrl = await uploadProposalPDF(dealId, pdfBuffer)
  log(dealId, `Subida OK — ${publicUrl}`)

  // 5. Guardar URL en el deal
  log(dealId, 'Guardando URL en BD…')
  const { error: updateError } = await admin
    .from('deals')
    .update({
      proposal_url:          publicUrl,
      proposal_generated_at: new Date().toISOString(),
    })
    .eq('id', dealId)

  if (updateError) {
    log(dealId, `ERROR al guardar URL: ${updateError.message}`)
    throw new Error(`No se pudo guardar proposal_url: ${updateError.message}`)
  }

  log(dealId, 'FIN — propuesta generada y guardada correctamente')
  return publicUrl
}
