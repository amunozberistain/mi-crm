'use client'

import { useState } from 'react'
import type { BudgetDraft } from '@/lib/ai/budget'
import { analyzeTranscript, generateBudgetPDF } from './actions'

type Step = 'input' | 'analyzing' | 'edit' | 'generating' | 'done'

export default function PresupuestoClient() {
  const [step, setStep]           = useState<Step>('input')
  const [transcript, setTranscript] = useState('')
  const [draft, setDraft]         = useState<BudgetDraft | null>(null)
  const [pdfUrl, setPdfUrl]       = useState<string | null>(null)
  const [error, setError]         = useState<string | null>(null)

  async function handleAnalyze() {
    if (!transcript.trim()) return
    setError(null)
    setStep('analyzing')
    try {
      const result = await analyzeTranscript(transcript)
      setDraft(result)
      setStep('edit')
    } catch {
      setError('Error analizando la transcripción. Inténtalo de nuevo.')
      setStep('input')
    }
  }

  async function handleGeneratePDF() {
    if (!draft) return
    setError(null)
    setStep('generating')
    try {
      const { url } = await generateBudgetPDF(draft)
      setPdfUrl(url)
      setStep('done')
    } catch {
      setError('Error generando el PDF. Inténtalo de nuevo.')
      setStep('edit')
    }
  }

  function updatePartida(
    i: number,
    field: keyof BudgetDraft['partidas'][0],
    value: string | number,
  ) {
    setDraft((prev) => ({
      ...prev!,
      partidas: prev!.partidas.map((p, idx) =>
        idx === i ? { ...p, [field]: value } : p,
      ),
    }))
  }

  function addPartida() {
    setDraft((prev) => ({
      ...prev!,
      partidas: [
        ...prev!.partidas,
        { concepto: '', descripcion: '', cantidad: 1, precio_unitario: 0 },
      ],
    }))
  }

  function removePartida(i: number) {
    setDraft((prev) => ({
      ...prev!,
      partidas: prev!.partidas.filter((_, idx) => idx !== i),
    }))
  }

  const total = draft
    ? draft.partidas.reduce((s, p) => s + p.cantidad * p.precio_unitario, 0)
    : 0

  const eur = (n: number) =>
    new Intl.NumberFormat('es-ES', {
      style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
    }).format(n)

  /* ─── Input ─────────────────────────────────────────────────────────── */
  if (step === 'input' || step === 'analyzing') {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Transcripción de la reunión
          </label>
          <textarea
            value={transcript}
            onChange={(e) => setTranscript(e.target.value)}
            rows={16}
            placeholder="Pega aquí la transcripción de la reunión con el cliente. Puede ser el texto de Zoom, Google Meet, Otter.ai, o cualquier otro formato…"
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            disabled={step === 'analyzing'}
          />
        </div>

        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}

        <button
          onClick={handleAnalyze}
          disabled={step === 'analyzing' || !transcript.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {step === 'analyzing' ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Claude analizando…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Analizar con IA
            </>
          )}
        </button>
      </div>
    )
  }

  /* ─── Done ───────────────────────────────────────────────────────────── */
  if (step === 'done' && pdfUrl) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="rounded-xl border border-green-200 bg-green-50 p-6 flex flex-col items-center gap-4 text-center">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-gray-900">PDF generado correctamente</p>
            <p className="text-sm text-gray-500 mt-0.5">El presupuesto está listo para compartir con el cliente</p>
          </div>
          <div className="flex gap-3">
            <a
              href={pdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Ver PDF
            </a>
            <button
              onClick={() => { setStep('input'); setTranscript(''); setDraft(null); setPdfUrl(null) }}
              className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Nuevo presupuesto
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ─── Edit ───────────────────────────────────────────────────────────── */
  if (!draft) return null

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Campos generales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Título del proyecto</label>
          <input
            value={draft.titulo}
            onChange={(e) => setDraft((p) => ({ ...p!, titulo: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Cliente</label>
          <input
            value={draft.cliente}
            onChange={(e) => setDraft((p) => ({ ...p!, cliente: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Plazo estimado</label>
          <input
            value={draft.plazo_estimado}
            onChange={(e) => setDraft((p) => ({ ...p!, plazo_estimado: e.target.value }))}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Descripción del proyecto</label>
          <textarea
            value={draft.descripcion_proyecto}
            onChange={(e) => setDraft((p) => ({ ...p!, descripcion_proyecto: e.target.value }))}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Tabla de partidas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900">Partidas</h3>
          <button
            onClick={addPartida}
            className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Añadir partida
          </button>
        </div>

        <div className="rounded-lg border border-gray-200 overflow-hidden">
          {/* Cabecera */}
          <div className="grid grid-cols-12 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide border-b border-gray-200">
            <div className="col-span-3">Concepto</div>
            <div className="col-span-4">Descripción</div>
            <div className="col-span-2 text-right">Uds.</div>
            <div className="col-span-2 text-right">€/ud.</div>
            <div className="col-span-1" />
          </div>

          {draft.partidas.map((p, i) => (
            <div key={i} className="grid grid-cols-12 items-center px-3 py-2 border-b border-gray-100 last:border-0 gap-1">
              <div className="col-span-3">
                <input
                  value={p.concepto}
                  onChange={(e) => updatePartida(i, 'concepto', e.target.value)}
                  placeholder="Concepto"
                  className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 py-0.5"
                />
              </div>
              <div className="col-span-4">
                <input
                  value={p.descripcion}
                  onChange={(e) => updatePartida(i, 'descripcion', e.target.value)}
                  placeholder="Descripción"
                  className="w-full text-sm border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 py-0.5 text-gray-500"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min={1}
                  value={p.cantidad}
                  onChange={(e) => updatePartida(i, 'cantidad', Number(e.target.value))}
                  className="w-full text-sm text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 py-0.5"
                />
              </div>
              <div className="col-span-2">
                <input
                  type="number"
                  min={0}
                  value={p.precio_unitario}
                  onChange={(e) => updatePartida(i, 'precio_unitario', Number(e.target.value))}
                  className="w-full text-sm text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 py-0.5"
                />
              </div>
              <div className="col-span-1 flex justify-end">
                <button
                  onClick={() => removePartida(i)}
                  className="text-gray-300 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-end px-4 py-3 bg-indigo-50 border-t border-indigo-100">
            <span className="text-sm font-bold text-indigo-700">{eur(total)}</span>
          </div>
        </div>
      </div>

      {/* Notas */}
      <div>
        <label className="block text-xs font-medium text-gray-500 mb-1 uppercase tracking-wide">Condiciones y notas</label>
        <textarea
          value={draft.notas}
          onChange={(e) => setDraft((p) => ({ ...p!, notas: e.target.value }))}
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Acciones */}
      <div className="flex items-center gap-3 pt-2">
        <button
          onClick={handleGeneratePDF}
          disabled={step === 'generating'}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors"
        >
          {step === 'generating' ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Generando PDF…
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
              </svg>
              Generar PDF
            </>
          )}
        </button>
        <button
          onClick={() => setStep('input')}
          className="text-sm text-gray-500 hover:text-gray-700 font-medium px-3 py-2.5"
        >
          ← Volver
        </button>
      </div>
    </div>
  )
}
