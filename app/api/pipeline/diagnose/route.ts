// Endpoint de diagnóstico — GET /api/pipeline/diagnose
// Devuelve JSON con el resultado de cada paso del flujo de propuestas.
// Solo accesible con sesión activa.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Anthropic from '@anthropic-ai/sdk'
import { buildProposalPDF } from '@/lib/pdf/proposal-template'

type StepResult = { ok: boolean; detail: string }

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new NextResponse('Unauthorized', { status: 401 })

  const r: Record<string, StepResult> = {}

  // ── 1. Variables de entorno ───────────────────────────────────────────────
  const apiKey = process.env.ANTHROPIC_API_KEY
  r.anthropic_key = {
    ok:     !!apiKey,
    detail: apiKey ? `Set — empieza con ${apiKey.substring(0, 10)}…` : 'NO CONFIGURADA',
  }

  const svcKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  r.supabase_service_key = {
    ok:     !!svcKey,
    detail: svcKey ? 'Set' : 'NO CONFIGURADA',
  }

  // ── 2. Supabase Storage — ¿existe el bucket proposals? ───────────────────
  try {
    const admin = createAdminClient()
    const { data: buckets, error } = await admin.storage.listBuckets()
    if (error) throw error
    const bucket = buckets?.find((b) => b.name === 'proposals')
    r.storage_bucket = {
      ok:     !!bucket,
      detail: bucket
        ? `Bucket 'proposals' encontrado (público: ${bucket.public})`
        : `Bucket 'proposals' NO existe. Buckets disponibles: ${buckets?.map((b) => b.name).join(', ') || 'ninguno'}`,
    }
  } catch (e) {
    r.storage_bucket = { ok: false, detail: String(e) }
  }

  // ── 3. Supabase Storage — ¿se puede subir un fichero? ────────────────────
  if (r.storage_bucket?.ok) {
    try {
      const admin = createAdminClient()
      const path  = `_diag_test/${Date.now()}.txt`
      const { error: uploadErr } = await admin.storage
        .from('proposals')
        .upload(path, Buffer.from('test'), { contentType: 'text/plain', upsert: true })
      if (uploadErr) throw uploadErr
      await admin.storage.from('proposals').remove([path])
      r.storage_upload = { ok: true, detail: 'Upload y delete de fichero de prueba OK' }
    } catch (e) {
      r.storage_upload = { ok: false, detail: String(e) }
    }
  }

  // ── 4. Columnas del deal ──────────────────────────────────────────────────
  try {
    const admin = createAdminClient()
    const { data, error } = await admin
      .from('deals')
      .select('id, proposal_url, proposal_generated_at')
      .limit(1)
    if (error) throw error
    r.deal_columns = {
      ok:     true,
      detail: data && data.length > 0
        ? `Columnas OK — último deal: proposal_url=${data[0].proposal_url ?? 'null'}`
        : 'Columnas OK (no hay deals todavía)',
    }
  } catch (e) {
    r.deal_columns = {
      ok:     false,
      detail: `Columnas proposal_url/proposal_generated_at NO existen en la tabla deals. Ejecuta el SQL de migración. Error: ${String(e)}`,
    }
  }

  // ── 5. Claude API ─────────────────────────────────────────────────────────
  try {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const msg = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 16,
      messages:   [{ role: 'user', content: 'Reply with exactly: OK' }],
    })
    const text = msg.content[0].type === 'text' ? msg.content[0].text : '(sin texto)'
    r.claude_api = { ok: true, detail: `Claude respondió: "${text}"` }
  } catch (e) {
    r.claude_api = { ok: false, detail: String(e) }
  }

  // ── 6. Generación de PDF ──────────────────────────────────────────────────
  try {
    const buf = await buildProposalPDF({
      data: {
        titulo:        'Propuesta de prueba',
        resumen:       'Resumen de prueba para verificar que el PDF se genera correctamente.',
        alcance:       ['Servicio A', 'Servicio B'],
        entregables:   ['Entregable 1'],
        cronograma:    '4 semanas',
        inversion:     { total: 5000, desglose: 'Precio fijo', forma_de_pago: '50/50' },
        condiciones:   ['Válido 30 días'],
        siguiente_paso: 'Firmar contrato',
      },
      dealTitle:      'Deal de prueba',
      contactName:    'Test Usuario',
      contactCompany: 'Test S.L.',
    })
    r.pdf_generation = {
      ok:     buf.length > 1000,
      detail: `PDF generado: ${buf.length} bytes`,
    }
  } catch (e) {
    r.pdf_generation = { ok: false, detail: String(e) }
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  const allOk = Object.values(r).every((v) => v.ok)
  return NextResponse.json({ all_ok: allOk, steps: r }, { status: 200 })
}
