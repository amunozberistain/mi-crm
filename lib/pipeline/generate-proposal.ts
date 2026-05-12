import { createAdminClient } from '@/lib/supabase/admin'
import { generateProposalContent } from '@/lib/ai/proposal'
import { buildProposalPDF } from '@/lib/pdf/proposal-template'
import { uploadProposalPDF } from '@/lib/storage/proposals'

// Orquesta el flujo completo:
// 1. Obtiene datos del deal y su contacto
// 2. Genera el contenido con Claude API
// 3. Renderiza el PDF
// 4. Sube a Supabase Storage
// 5. Guarda la URL en deals.proposal_url
export async function generateProposalForDeal(dealId: string): Promise<string> {
  const admin = createAdminClient()

  // 1. Datos del deal + contacto
  const { data: deal, error } = await admin
    .from('deals')
    .select('id, title, value, probability, contacts(name, company, email)')
    .eq('id', dealId)
    .single()

  if (error || !deal) throw new Error(`Deal no encontrado: ${dealId}`)

  const contact = deal.contacts as { name: string; company: string | null; email: string | null } | null

  // 2. Claude genera el contenido estructurado
  const content = await generateProposalContent({
    title:          deal.title    as string,
    contactName:    contact?.name    ?? null,
    contactCompany: contact?.company ?? null,
    value:          (deal.value as number)       ?? 0,
    probability:    (deal.probability as number) ?? 0,
  })

  // 3. Renderizar PDF con @react-pdf/renderer
  const pdfBuffer = await buildProposalPDF({
    data:           content,
    dealTitle:      deal.title    as string,
    contactName:    contact?.name    ?? null,
    contactCompany: contact?.company ?? null,
  })

  // 4. Subir a Supabase Storage bucket "proposals"
  const publicUrl = await uploadProposalPDF(dealId, pdfBuffer)

  // 5. Guardar URL en el deal
  await admin
    .from('deals')
    .update({
      proposal_url:          publicUrl,
      proposal_generated_at: new Date().toISOString(),
    })
    .eq('id', dealId)

  return publicUrl
}
