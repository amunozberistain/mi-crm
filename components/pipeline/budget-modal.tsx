'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface Props {
  dealId:        string
  dealTitle:     string
  open:          boolean
  onOpenChange:  (open: boolean) => void
  onSuccess:     (url: string) => void
}

export default function BudgetModal({ dealId, dealTitle, open, onOpenChange, onSuccess }: Props) {
  const [transcript,   setTranscript]   = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error,        setError]        = useState<string | null>(null)
  const [pdfUrl,       setPdfUrl]       = useState<string | null>(null)

  async function handleGenerate() {
    if (!transcript.trim() || isGenerating) return
    setError(null)
    setIsGenerating(true)
    try {
      const res = await fetch('/api/pipeline/generate-budget', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dealId, transcript }),
      })
      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || `Error ${res.status}`)
      }
      const { url } = await res.json() as { url: string }
      setPdfUrl(url)
      onSuccess(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error generando el presupuesto')
    } finally {
      setIsGenerating(false)
    }
  }

  function handleOpenChange(val: boolean) {
    if (isGenerating) return
    onOpenChange(val)
    if (!val) {
      setTranscript('')
      setError(null)
      setPdfUrl(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            Generar presupuesto
            <span className="block text-xs font-normal text-gray-400 mt-0.5 truncate">{dealTitle}</span>
          </DialogTitle>
        </DialogHeader>

        {pdfUrl ? (
          /* ── Éxito ── */
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <p className="font-semibold text-gray-900">Presupuesto generado</p>
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
                onClick={() => handleOpenChange(false)}
                className="text-sm text-gray-600 hover:text-gray-900 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        ) : (
          /* ── Formulario ── */
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
                disabled={isGenerating}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none disabled:opacity-60"
              />
              <p className="text-xs text-gray-400 mt-1">
                Claude analizará la transcripción y generará el presupuesto (~15 segundos)
              </p>
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => handleOpenChange(false)}
                disabled={isGenerating}
                className="text-sm text-gray-600 font-medium px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 disabled:opacity-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !transcript.trim()}
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {isGenerating ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generando con IA…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Generar presupuesto
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
