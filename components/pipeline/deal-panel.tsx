'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { updateDeal } from '@/app/(dashboard)/pipeline/actions'
import { PIPELINE_STAGES, FORMA_PAGO_OPTIONS } from '@/lib/constants'
import BudgetModal from './budget-modal'
import ProposalModal from './proposal-modal'
import type { Contact, Deal } from '@/types'

interface Props {
  deal:           Deal
  contacts:       Pick<Contact, 'id' | 'name' | 'company'>[]
  onClose:        () => void
  onDealUpdated:  (dealId: string, updates: Partial<Deal>) => void
}

export default function DealPanel({ deal, contacts, onClose, onDealUpdated }: Props) {
  const [title,          setTitle]          = useState(deal.title)
  const [stage,          setStage]          = useState(deal.stage)
  const [value,          setValue]          = useState(String(deal.value ?? 0))
  const [contactId,      setContactId]      = useState(deal.contact_id ?? '')
  const [cantidadVideos, setCantidadVideos] = useState(String(deal.cantidad_videos ?? ''))
  const [formaPago,      setFormaPago]      = useState(deal.forma_pago ?? '')

  const [isSaving,   setIsSaving]   = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [saveOk,     setSaveOk]     = useState(false)

  const [budgetUrl,   setBudgetUrl]   = useState<string | null>(deal.budget_url)
  const [proposalUrl, setProposalUrl] = useState<string | null>(deal.proposal_url)

  const [budgetOpen,   setBudgetOpen]   = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)

  const contact = contacts.find(c => c.id === (contactId || deal.contact_id)) ?? null

  async function handleSave() {
    if (isSaving) return
    setSaveError(null)
    setSaveOk(false)
    setIsSaving(true)
    try {
      const updates = {
        title,
        stage,
        value:          parseFloat(value) || 0,
        contact_id:     contactId || null,
        cantidad_videos: cantidadVideos ? parseInt(cantidadVideos) : null,
        forma_pago:     formaPago || null,
      }
      await updateDeal(deal.id, updates)
      onDealUpdated(deal.id, updates)
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2000)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  const inputCls = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'
  const selectCls = inputCls
  const labelCls = 'block text-xs font-medium text-gray-500 mb-1'

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/20" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-96 bg-white shadow-2xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-indigo-600 uppercase tracking-wide mb-1">Deal</p>
            <h2 className="text-base font-semibold text-gray-900 leading-snug truncate" title={deal.title}>
              {deal.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="ml-3 p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Título */}
          <div>
            <label className={labelCls}>Título</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </div>

          {/* Etapa */}
          <div>
            <label className={labelCls}>Etapa</label>
            <select value={stage} onChange={(e) => setStage(e.target.value)} className={selectCls}>
              {PIPELINE_STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Contacto */}
          <div>
            <label className={labelCls}>Contacto</label>
            <select value={contactId} onChange={(e) => setContactId(e.target.value)} className={selectCls}>
              <option value="">Sin contacto</option>
              {contacts.map(c => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Valor + Vídeos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Valor (€)</label>
              <input
                type="number" min="0" step="100"
                value={value} onChange={(e) => setValue(e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <label className={labelCls}>Cantidad de vídeos</label>
              <input
                type="number" min="1"
                value={cantidadVideos} onChange={(e) => setCantidadVideos(e.target.value)}
                placeholder="—"
                className={inputCls}
              />
            </div>
          </div>

          {/* Forma de pago */}
          <div>
            <label className={labelCls}>Forma de pago</label>
            <select value={formaPago} onChange={(e) => setFormaPago(e.target.value)} className={selectCls}>
              <option value="">Sin especificar</option>
              {FORMA_PAGO_OPTIONS.map(op => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
          </div>

          {/* Save feedback */}
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{saveError}</p>
          )}

          {/* Divider */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Documentos</p>

            {/* Budget */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 mb-1.5">Presupuesto PDF</p>
              <div className="flex items-center gap-2">
                {budgetUrl ? (
                  <>
                    <a
                      href={budgetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Ver presupuesto
                    </a>
                    <span className="text-gray-300">·</span>
                    <button
                      onClick={() => setBudgetOpen(true)}
                      className="text-xs text-gray-400 hover:text-violet-600"
                    >
                      Regenerar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setBudgetOpen(true)}
                    className="text-xs text-violet-600 hover:text-violet-800 font-medium underline underline-offset-2"
                  >
                    Generar presupuesto
                  </button>
                )}
              </div>
            </div>

            {/* Proposal */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Propuesta PDF</p>
              <div className="flex items-center gap-2">
                {proposalUrl ? (
                  <>
                    <a
                      href={proposalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Ver propuesta
                    </a>
                    <span className="text-gray-300">·</span>
                    <button
                      onClick={() => setProposalOpen(true)}
                      className="text-xs text-gray-400 hover:text-indigo-600"
                    >
                      Regenerar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setProposalOpen(true)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
                  >
                    Crear propuesta
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer — save button */}
        <div className="flex-shrink-0 px-5 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'w-full flex items-center justify-center gap-2 text-sm font-medium px-4 py-2.5 rounded-lg transition-colors',
              saveOk
                ? 'bg-green-600 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-60'
            )}
          >
            {isSaving ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Guardando…
              </>
            ) : saveOk ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Guardado
              </>
            ) : (
              'Guardar cambios'
            )}
          </button>
        </div>
      </div>

      <BudgetModal
        dealId={deal.id}
        dealTitle={deal.title}
        formaPago={formaPago || deal.forma_pago}
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        onSuccess={(url) => {
          setBudgetUrl(url)
          onDealUpdated(deal.id, { budget_url: url })
        }}
      />

      <ProposalModal
        dealId={deal.id}
        dealTitle={deal.title}
        contactName={contact?.name ?? deal.contacts?.name ?? null}
        contactCompany={contact?.company ?? deal.contacts?.company ?? null}
        open={proposalOpen}
        onOpenChange={setProposalOpen}
        onSuccess={(url) => {
          setProposalUrl(url)
          onDealUpdated(deal.id, { proposal_url: url })
        }}
      />
    </>
  )
}
