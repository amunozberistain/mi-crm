'use client'

import { useState, useRef } from 'react'
import { submitCaptacionLead } from './actions'

interface UtmParams {
  utm_source:   string | null
  utm_medium:   string | null
  utm_campaign: string | null
  utm_content:  string | null
  utm_term:     string | null
  fbclid:       string | null
}

export default function CaptacionForm({ utmParams }: { utmParams: UtmParams }) {
  const [submitted, setSubmitted] = useState(false)
  const [isPending, setIsPending]  = useState(false)
  const [error, setError]          = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      await submitCaptacionLead(new FormData(e.currentTarget))
      setSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar. Inténtalo de nuevo.')
    } finally {
      setIsPending(false)
    }
  }

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">¡Gracias!</h2>
        <p className="text-gray-500 mt-2 text-sm">Nos pondremos en contacto contigo en breve.</p>
      </div>
    )
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="space-y-5">
      {/* Campos UTM ocultos — se rellenan automáticamente desde la URL del anuncio */}
      <input type="hidden" name="utm_source"   value={utmParams.utm_source   ?? ''} />
      <input type="hidden" name="utm_medium"   value={utmParams.utm_medium   ?? ''} />
      <input type="hidden" name="utm_campaign" value={utmParams.utm_campaign ?? ''} />
      <input type="hidden" name="utm_content"  value={utmParams.utm_content  ?? ''} />
      <input type="hidden" name="utm_term"     value={utmParams.utm_term     ?? ''} />
      <input type="hidden" name="fbclid"       value={utmParams.fbclid       ?? ''} />

      <div className="space-y-1.5">
        <label htmlFor="cap-name" className="block text-sm font-medium text-gray-700">
          Nombre <span className="text-red-500">*</span>
        </label>
        <input
          id="cap-name"
          name="name"
          required
          placeholder="Tu nombre completo"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cap-email" className="block text-sm font-medium text-gray-700">
          Email
        </label>
        <input
          id="cap-email"
          name="email"
          type="email"
          placeholder="tu@email.com"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="cap-phone" className="block text-sm font-medium text-gray-700">
          Teléfono
        </label>
        <input
          id="cap-phone"
          name="phone"
          type="tel"
          placeholder="+34 600 000 000"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold py-3 rounded-lg transition-colors shadow-sm"
      >
        {isPending ? 'Enviando…' : 'Solicitar información'}
      </button>
    </form>
  )
}
