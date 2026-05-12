import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'proposals'

export async function uploadProposalPDF(dealId: string, buffer: Buffer): Promise<string> {
  const admin    = createAdminClient()
  const filePath = `${dealId}/${Date.now()}.pdf`

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(filePath, buffer, {
      contentType: 'application/pdf',
      upsert:      true,   // sobreescribe si ya existe (regeneración)
    })

  if (error) throw new Error(`Supabase Storage: ${error.message}`)

  const { data } = admin.storage.from(BUCKET).getPublicUrl(filePath)
  return data.publicUrl
}
