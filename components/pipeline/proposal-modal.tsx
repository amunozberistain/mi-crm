'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { ProposalContent } from '@/lib/ai/proposal'

interface Props {
  dealId:          string
  dealTitle:       string
  contactName:     string | null
  contactCompany:  string | null
  initialContent?: ProposalContent | null  // provided → edit mode, skip AI extraction
  open:            boolean
  onOpenChange:    (open: boolean) => void
  onSuccess:       (url: string, content: ProposalContent) => void
}

type Step = 'extracting' | 'edit' | 'rendering' | 'done' | 'error'

function arrToText(arr: string[]) { return arr.join('\n') }
function textToArr(text: string)  { return text.split('\n').map(s => s.trim()).filter(Boolean) }

export default function ProposalModal({
  dealId, dealTitle, contactName, contactCompany, initialContent, open, onOpenChange, onSuccess,
}: Props) {
  const [step,    setStep]    = useState<Step>('extracting')
  const [content, setContent] = useState<ProposalContent | null>(null)
  const [pdfUrl,  setPdfUrl]  = useState<string | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  // Editable fields
  const [titulo,        setTitulo]        = useState('')
  const [resumen,       setResumen]       = useState('')
  const [alcance,       setAlcance]       = useState('')
  const [entregables,   setEntregables]   = useState('')
  const [cronograma,    setCronograma]    = useState('')
  const [invTotal,      setInvTotal]      = useState(0)
  const [invDesglose,   setInvDesglose]   = useState('')
  const [invFormaPago,  setInvFormaPago]  = useState('')
  const [condiciones,   setCondiciones]   = useState('')
  const [siguientePaso, setSiguientePaso] = useState('')

  const isEditMode = !!initialContent

  function loadContentIntoState(c: ProposalContent) {
    setContent(c)
    setTitulo(c.titulo)
    setResumen(c.resumen)
    setAlcance(arrToText(c.alcance))
    setEntregables(arrToText(c.entregables))
    setCronograma(c.cronograma)
    setInvTotal(c.inversion.total)
    setInvDesglose(c.inversion.desglose)
    setInvFormaPago(c.inversion.forma_de_pago)
    setCondiciones(arrToText(c.condiciones))
    setSiguientePaso(c.siguiente_paso)
  }

  // Reinitialise every time the modal opens — open toggle is the trigger.
  // initialContent/dealId intentionally excluded: we want stable extraction per open, not on prop change.
  useEffect(() => {
    if (!open) return
    setError(null)
    setPdfUrl(null)

    if (initialContent) {
      loadContentIntoState(initialContent)
      setStep('edit')
      return
    }

    setStep('extracting')
    fetch('/api/pipeline/extract-proposal', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ dealId }),
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(await res.text())
        const { content: c } = await res.json() as { content: ProposalContent }
        loadContentIntoState(c)
        setStep('edit')
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : 'Error generando la propuesta')
        setStep('error')
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function handleRender() {
    setStep('rendering')
    setError(null)
    const editedContent: ProposalContent = {
      titulo,
      resumen,
      alcance:        textToArr(alcance),
      entregables:    textToArr(entregables),
      cronograma,
      inversion: {
        total:         invTotal,
        desglose:      invDesglose,
        forma_de_pago: invFormaPago,
      },
      condiciones:    textToArr(condiciones),
      siguiente_paso: siguientePaso,
    }
    try {
      const res = await fetch('/api/pipeline/render-proposal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dealId, content: editedContent, dealTitle, contactName, contactCompany }),
      })
      if (!res.ok) throw new Error(await res.text())
      const { url } = await res.json() as { url: string }
      setPdfUrl(url)
      onSuccess(url, editedContent)
      setStep('done')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando el PDF')
      setStep('edit')
    }
  }

  function handleClose(val: boolean) {
    if (step === 'extracting' || step === 'rendering') return
    onOpenChange(val)
  }

  const inputCls = 'w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
  const textCls  = `${inputCls} resize-none`
  const labelCls = 'block text-xs font-medium text-gray-600 mb-1'

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-base">
            {isEditMode ? 'Editar propuesta' : 'Crear propuesta'}
            <span className="block text-xs font-normal text-gray-400 mt-0.5 truncate">{dealTitle}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 pr-1">

        {/* ── Extracting ── */}
        {step === 'extracting' && (
          <div className="flex flex-col items-center gap-4 py-12 text-center">
            <svg className="w-8 h-8 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <div>
              <p className="font-medium text-gray-800">Analizando el proyecto con IA…</p>
              <p className="text-sm text-gray-400 mt-1">Claude está generando el contenido de la propuesta</p>
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {step === 'error' && (
          <div className="py-6 space-y-4">
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
            <div className="flex justify-end">
              <button onClick={() => handleClose(false)} className="text-sm text-gray-600 font-medium px-4 py-2 rounded-lg border border-gray-200">
                Cerrar
              </button>
            </div>
          </div>
        )}

        {/* ── Edit ── */}
        {(step === 'edit' || step === 'rendering') && content && (
          <div className="space-y-4 mt-1">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Título de la propuesta</label>
                <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Cronograma</label>
                <input value={cronograma} onChange={(e) => setCronograma(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div>
              <label className={labelCls}>Resumen ejecutivo</label>
              <textarea value={resumen} onChange={(e) => setResumen(e.target.value)} rows={4} className={textCls} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Alcance y objetivos <span className="text-gray-400">(uno por línea)</span></label>
                <textarea value={alcance} onChange={(e) => setAlcance(e.target.value)} rows={5} className={textCls} />
              </div>
              <div>
                <label className={labelCls}>Entregables <span className="text-gray-400">(uno por línea)</span></label>
                <textarea value={entregables} onChange={(e) => setEntregables(e.target.value)} rows={5} className={textCls} />
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 p-3 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Inversión</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Total (USD)</label>
                  <input type="number" min="0" value={invTotal} onChange={(e) => setInvTotal(parseFloat(e.target.value) || 0)} className={inputCls} />
                </div>
                <div className="col-span-2">
                  <label className={labelCls}>Forma de pago</label>
                  <input value={invFormaPago} onChange={(e) => setInvFormaPago(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Desglose</label>
                <textarea value={invDesglose} onChange={(e) => setInvDesglose(e.target.value)} rows={3} className={textCls} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Condiciones <span className="text-gray-400">(una por línea)</span></label>
                <textarea value={condiciones} onChange={(e) => setCondiciones(e.target.value)} rows={4} className={textCls} />
              </div>
              <div>
                <label className={labelCls}>Siguiente paso / CTA</label>
                <textarea value={siguientePaso} onChange={(e) => setSiguientePaso(e.target.value)} rows={4} className={textCls} />
              </div>
            </div>

            {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => handleClose(false)}
                disabled={step === 'rendering'}
                className="text-sm text-gray-600 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleRender}
                disabled={step === 'rendering'}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {step === 'rendering' ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Guardando PDF…
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
        )}

        {/* ── Done ── */}
        {step === 'done' && pdfUrl && (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {isEditMode ? 'Propuesta actualizada' : 'Propuesta generada'}
              </p>
              <p className="text-sm text-gray-500 mt-0.5">El PDF está listo para compartir</p>
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
