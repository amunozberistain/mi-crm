'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { updateDeal, deleteDeal, clearDealDocument } from '@/app/(dashboard)/pipeline/actions'
import { PIPELINE_STAGES, FORMA_PAGO_OPTIONS } from '@/lib/constants'
import BudgetModal from './budget-modal'
import ProposalModal from './proposal-modal'
import type { Contact, Deal } from '@/types'
import type { BudgetDraft } from '@/lib/ai/budget'
import type { ProposalContent } from '@/lib/ai/proposal'

interface Props {
  deal:            Deal
  contacts:        Pick<Contact, 'id' | 'name' | 'company'>[]
  onClose:         () => void
  onDealUpdated:   (dealId: string, updates: Partial<Deal>) => void
  onDealDeleted:   (dealId: string) => void
}

export default function DealPanel({ deal, contacts, onClose, onDealUpdated, onDealDeleted }: Props) {
  const [title,          setTitle]          = useState(deal.title)
  const [stage,          setStage]          = useState(deal.stage)
  const [value,          setValue]          = useState(String(deal.value ?? 0))
  const [contactId,      setContactId]      = useState(deal.contact_id ?? '')
  const [cantidadVideos, setCantidadVideos] = useState(String(deal.cantidad_videos ?? ''))
  const [formaPago,      setFormaPago]      = useState(deal.forma_pago ?? '')
  const [notes,          setNotes]          = useState(deal.notes ?? '')

  const [isSaving,   setIsSaving]   = useState(false)
  const [saveError,  setSaveError]  = useState<string | null>(null)
  const [saveOk,     setSaveOk]     = useState(false)

  const [budgetUrl,   setBudgetUrl]   = useState<string | null>(deal.budget_url)
  const [proposalUrl, setProposalUrl] = useState<string | null>(deal.proposal_url)

  const [budgetDraft,     setBudgetDraft]     = useState<BudgetDraft | null>(
    deal.budget_draft as BudgetDraft | null ?? null
  )
  const [proposalContent, setProposalContent] = useState<ProposalContent | null>(
    deal.proposal_content as ProposalContent | null ?? null
  )
  const [budgetMode,   setBudgetMode]   = useState<'new' | 'edit'>('new')
  const [proposalMode, setProposalMode] = useState<'new' | 'edit'>('new')

  const [budgetOpen,   setBudgetOpen]   = useState(false)
  const [proposalOpen, setProposalOpen] = useState(false)

  const [confirmDelete,        setConfirmDelete]        = useState(false)
  const [isDeleting,           setIsDeleting]           = useState(false)
  const [confirmDeleteBudget,  setConfirmDeleteBudget]  = useState(false)
  const [confirmDeleteProposal,setConfirmDeleteProposal]= useState(false)
  const [isDeletingBudget,     setIsDeletingBudget]     = useState(false)
  const [isDeletingProposal,   setIsDeletingProposal]   = useState(false)

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
        value:           parseFloat(value) || 0,
        contact_id:      contactId || null,
        cantidad_videos: cantidadVideos ? parseInt(cantidadVideos) : null,
        forma_pago:      formaPago || null,
        notes:           notes.trim() || null,
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

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteDeal(deal.id)
      onDealDeleted(deal.id)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Error al eliminar')
      setConfirmDelete(false)
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleDeleteBudget() {
    setIsDeletingBudget(true)
    try {
      await clearDealDocument(deal.id, 'budget')
      setBudgetUrl(null)
      onDealUpdated(deal.id, { budget_url: null, budget_generated_at: null })
      setConfirmDeleteBudget(false)
    } catch {
      setConfirmDeleteBudget(false)
    } finally {
      setIsDeletingBudget(false)
    }
  }

  async function handleDeleteProposal() {
    setIsDeletingProposal(true)
    try {
      await clearDealDocument(deal.id, 'proposal')
      setProposalUrl(null)
      onDealUpdated(deal.id, { proposal_url: null, proposal_generated_at: null })
      setConfirmDeleteProposal(false)
    } catch {
      setConfirmDeleteProposal(false)
    } finally {
      setIsDeletingProposal(false)
    }
  }

  const inputCls  = 'w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white'
  const selectCls = inputCls
  const labelCls  = 'block text-xs font-medium text-gray-500 mb-1'

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

          {/* Notas */}
          <div>
            <label className={labelCls}>Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observaciones, contexto, seguimiento…"
              className={cn(inputCls, 'resize-none')}
            />
          </div>

          {/* Save error */}
          {saveError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{saveError}</p>
          )}

          {/* Documentos */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Documentos</p>

            {/* Budget */}
            <div className="mb-3">
              <p className="text-xs font-medium text-gray-600 mb-1.5">Presupuesto PDF</p>
              {budgetUrl ? (
                <div className="flex items-center gap-2 flex-wrap">
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
                  {budgetDraft && (
                    <>
                      <button
                        onClick={() => { setBudgetMode('edit'); setBudgetOpen(true) }}
                        className="text-xs text-gray-400 hover:text-violet-600"
                      >
                        Editar PDF
                      </button>
                      <span className="text-gray-300">·</span>
                    </>
                  )}
                  <button
                    onClick={() => { setBudgetMode('new'); setBudgetOpen(true) }}
                    className="text-xs text-gray-400 hover:text-violet-600"
                  >
                    Regenerar
                  </button>
                  <span className="text-gray-300">·</span>
                  {confirmDeleteBudget ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-500">¿Eliminar?</span>
                      <button
                        onClick={handleDeleteBudget}
                        disabled={isDeletingBudget}
                        className="text-red-600 font-medium hover:text-red-800 disabled:opacity-50"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmDeleteBudget(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteBudget(true)}
                      className="text-xs text-gray-300 hover:text-red-500"
                      title="Eliminar presupuesto"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setBudgetMode('new'); setBudgetOpen(true) }}
                  className="text-xs text-violet-600 hover:text-violet-800 font-medium underline underline-offset-2"
                >
                  Generar presupuesto
                </button>
              )}
            </div>

            {/* Proposal */}
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Propuesta PDF</p>
              {proposalUrl ? (
                <div className="flex items-center gap-2 flex-wrap">
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
                  {proposalContent && (
                    <>
                      <button
                        onClick={() => { setProposalMode('edit'); setProposalOpen(true) }}
                        className="text-xs text-gray-400 hover:text-indigo-600"
                      >
                        Editar PDF
                      </button>
                      <span className="text-gray-300">·</span>
                    </>
                  )}
                  <button
                    onClick={() => { setProposalMode('new'); setProposalOpen(true) }}
                    className="text-xs text-gray-400 hover:text-indigo-600"
                  >
                    Regenerar
                  </button>
                  <span className="text-gray-300">·</span>
                  {confirmDeleteProposal ? (
                    <span className="flex items-center gap-1.5 text-xs">
                      <span className="text-gray-500">¿Eliminar?</span>
                      <button
                        onClick={handleDeleteProposal}
                        disabled={isDeletingProposal}
                        className="text-red-600 font-medium hover:text-red-800 disabled:opacity-50"
                      >
                        Sí
                      </button>
                      <button
                        onClick={() => setConfirmDeleteProposal(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteProposal(true)}
                      className="text-xs text-gray-300 hover:text-red-500"
                      title="Eliminar propuesta"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={() => { setProposalMode('new'); setProposalOpen(true) }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-medium underline underline-offset-2"
                >
                  Crear propuesta
                </button>
              )}
            </div>
          </div>

          {/* Danger zone */}
          <div className="border-t border-gray-100 pt-4">
            {confirmDelete ? (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-2">
                <p className="text-sm font-medium text-red-800">¿Eliminar este deal?</p>
                <p className="text-xs text-red-600">Esta acción no se puede deshacer.</p>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-medium px-3 py-1.5 rounded-md transition-colors"
                  >
                    {isDeleting ? 'Eliminando…' : 'Sí, eliminar deal'}
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    disabled={isDeleting}
                    className="flex-1 border border-gray-200 text-gray-600 text-xs font-medium px-3 py-1.5 rounded-md hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="w-full text-xs text-red-500 hover:text-red-700 font-medium py-2 rounded-lg border border-red-100 hover:border-red-300 hover:bg-red-50 transition-colors"
              >
                Eliminar deal
              </button>
            )}
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
        initialDraft={budgetMode === 'edit' ? budgetDraft : null}
        open={budgetOpen}
        onOpenChange={setBudgetOpen}
        onSuccess={(url, draft) => {
          setBudgetUrl(url)
          setBudgetDraft(draft)
          onDealUpdated(deal.id, { budget_url: url, budget_draft: draft as unknown as Record<string, unknown> })
        }}
      />

      <ProposalModal
        dealId={deal.id}
        dealTitle={deal.title}
        contactName={contact?.name ?? deal.contacts?.name ?? null}
        contactCompany={contact?.company ?? deal.contacts?.company ?? null}
        initialContent={proposalMode === 'edit' ? proposalContent : null}
        open={proposalOpen}
        onOpenChange={setProposalOpen}
        onSuccess={(url, content) => {
          setProposalUrl(url)
          setProposalContent(content)
          onDealUpdated(deal.id, { proposal_url: url, proposal_content: content as unknown as Record<string, unknown> })
        }}
      />
    </>
  )
}
