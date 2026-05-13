'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { BudgetDraft } from '@/lib/ai/budget'

interface Props {
  dealId:        string
  dealTitle:     string
  formaPago?:    string | null
  initialDraft?: BudgetDraft | null   // provided → open in edit mode, skip transcript
  open:          boolean
  onOpenChange:  (open: boolean) => void
  onSuccess:     (url: string, draft: BudgetDraft) => void
}

type Step = 'transcript' | 'edit' | 'done'

type Partida = BudgetDraft['partidas'][number]

const emptyPartida = (): Partida => ({ concepto: '', descripcion: '', cantidad: 1, precio_unitario: 0 })

const usd = (n: number) =>
  '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(n)

export default function BudgetModal({
  dealId, dealTitle, formaPago, initialDraft, open, onOpenChange, onSuccess,
}: Props) {
  const isEditMode = !!initialDraft

  const [step,       setStep]       = useState<Step>(isEditMode ? 'edit' : 'transcript')
  const [transcript, setTranscript] = useState('')
  const [draft,      setDraft]      = useState<BudgetDraft | null>(null)
  const [pdfUrl,     setPdfUrl]     = useState<string | null>(null)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  const [titulo,      setTitulo]      = useState('')
  const [cliente,     setCliente]     = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [partidas,    setPartidas]    = useState<Partida[]>([emptyPartida()])
  const [plazo,       setPlazo]       = useState('')
  const [notas,       setNotas]       = useState('')

  function loadDraftIntoState(d: BudgetDraft) {
    setDraft(d)
    setTitulo(d.titulo)
    setCliente(d.cliente)
    setDescripcion(d.descripcion_proyecto)
    setPartidas(d.partidas.length ? d.partidas : [emptyPartida()])
    setPlazo(d.plazo_estimado)
    setNotas(d.notas)
  }

  // Reinitialise every time the modal opens
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return
    setError(null)
    setPdfUrl(null)
    setLoading(false)
    if (initialDraft) {
      loadDraftIntoState(initialDraft)
      setStep('edit')
    } else {
      setStep('transcript')
      setTranscript('')
      setDraft(null)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleExtract() {
    if (!transcript.trim() || loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch('/api/pipeline/extract-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { draft: d } = await res.json() as { draft: BudgetDraft }
      loadDraftIntoState(d)
      setStep('edit')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al analizar la transcripción')
    } finally {
      setLoading(false)
    }
  }

  async function handleRender() {
    if (loading) return
    setError(null)
    setLoading(true)
    const editedDraft: BudgetDraft = {
      titulo,
      cliente,
      descripcion_proyecto: descripcion,
      partidas,
      plazo_estimado: plazo,
      notas,
    }
    try {
      const res = await fetch('/api/pipeline/render-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dealId, draft: editedDraft, formaPago }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json() as { url: string }
      setPdfUrl(url)
      onSuccess(url, editedDraft)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando el PDF')
    } finally {
      setLoading(false)
    }
  }

  function handleClose(val: boolean) {
    if (loading) return
    onOpenChange(val)
  }

  function updatePartida(i: number, field: keyof Partida, raw: string) {
    setPartidas(prev => prev.map((p, idx) => {
      if (idx !== i) return p
      if (field === 'cantidad' || field === 'precio_unitario') {
        return { ...p, [field]: parseFloat(raw) || 0 }
      }
      return { ...p, [field]: raw }
    }))
  }

  const total = partidas.reduce((s, p) => s + p.cantidad * p.precio_unitario, 0)

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const textCls  = `${inputCls} resize-none`

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base">
            {isEditMode ? 'Editar presupuesto' : 'Generar presupuesto'}
            <span className="block text-xs font-normal text-gray-400 mt-0.5 truncate">{dealTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1">

        {/* ── Step 1: Transcript (only in new mode) ── */}
        {step === 'transcript' && (
          <div className="space-y-4 mt-1">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Transcripción de la reunión
              </label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={11}
                placeholder="Pega aquí la transcripción de la reunión con el cliente (Zoom, Google Meet, Otter.ai…)"
                disabled={loading}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-60"
              />
              <p className="text-xs text-gray-400 mt-1">
                Claude analizará la transcripción y extraerá un borrador editable (~10s)
              </p>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => handleClose(false)}
                disabled={loading}
                className="text-sm text-gray-600 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleExtract}
                disabled={loading || !transcript.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {loading ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Analizando…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Analizar con IA
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Edit draft ── */}
        {step === 'edit' && (draft || isEditMode) && (
          <div className="space-y-5 mt-1">
            {/* Título + Cliente */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Título del proyecto</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Cliente</label>
                <input value={cliente} onChange={(e) => setCliente(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Descripción del proyecto</label>
              <textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                rows={3}
                className={textCls}
              />
            </div>

            {/* Partidas */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Partidas</label>
              <div className="rounded-lg border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="text-left px-2 py-1.5 font-medium text-gray-500 w-28">Concepto</th>
                      <th className="text-left px-2 py-1.5 font-medium text-gray-500">Descripción</th>
                      <th className="text-right px-2 py-1.5 font-medium text-gray-500 w-14">Uds.</th>
                      <th className="text-right px-2 py-1.5 font-medium text-gray-500 w-20">$/ud.</th>
                      <th className="text-right px-2 py-1.5 font-medium text-gray-500 w-20">Total</th>
                      <th className="w-7" />
                    </tr>
                  </thead>
                  <tbody>
                    {partidas.map((p, i) => (
                      <tr key={i} className="border-b border-gray-100 last:border-0">
                        <td className="px-1 py-1">
                          <input
                            value={p.concepto}
                            onChange={(e) => updatePartida(i, 'concepto', e.target.value)}
                            className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={p.descripcion}
                            onChange={(e) => updatePartida(i, 'descripcion', e.target.value)}
                            className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="1"
                            value={p.cantidad}
                            onChange={(e) => updatePartida(i, 'cantidad', e.target.value)}
                            className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={p.precio_unitario}
                            onChange={(e) => updatePartida(i, 'precio_unitario', e.target.value)}
                            className="w-full rounded border border-gray-200 px-1.5 py-1 text-xs text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                          />
                        </td>
                        <td className="px-2 py-1 text-right text-gray-700 font-medium tabular-nums">
                          {usd(p.cantidad * p.precio_unitario)}
                        </td>
                        <td className="px-1 py-1">
                          <button
                            onClick={() => setPartidas(prev => prev.filter((_, idx) => idx !== i))}
                            className="text-gray-300 hover:text-red-500 transition-colors text-base leading-none"
                            title="Eliminar"
                          >
                            ×
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-800">
                      <td colSpan={4} className="px-2 py-2 text-xs font-semibold text-gray-300 uppercase tracking-wide">
                        Total
                      </td>
                      <td className="px-2 py-2 text-right text-sm font-bold text-white tabular-nums">
                        {usd(total)}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
              <button
                onClick={() => setPartidas(prev => [...prev, emptyPartida()])}
                className="mt-2 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                + Añadir partida
              </button>
            </div>

            {/* Plazo + Notas */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Plazo estimado</label>
                <input
                  value={plazo}
                  onChange={(e) => setPlazo(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notas / condiciones</label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className={textCls}
                />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}

            <div className="flex items-center justify-between pt-1">
              {!isEditMode ? (
                <button
                  onClick={() => setStep('transcript')}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Volver
                </button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => handleClose(false)}
                  className="text-sm text-gray-600 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRender}
                  disabled={loading || partidas.length === 0}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                >
                  {loading ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Generando PDF…
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {isEditMode ? 'Guardar PDF final' : 'Generar PDF final'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: Done ── */}
        {step === 'done' && pdfUrl && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {isEditMode ? 'Presupuesto actualizado' : 'Presupuesto generado'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">El PDF está listo para compartir con el cliente</p>
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
                onClick={() => handleClose(false)}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        )}

        </div>
      </DialogContent>
    </Dialog>
  )
}
