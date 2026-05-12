'use client'

import { useState } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types'
import BudgetModal from './budget-modal'

interface Props {
  deal:       Deal
  isOverlay?: boolean
}

function getDaysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function DealCard({ deal, isOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:       deal.id,
    disabled: isOverlay,
  })

  const [isGeneratingProposal, setIsGeneratingProposal] = useState(false)
  const [budgetModalOpen,      setBudgetModalOpen]      = useState(false)
  const [budgetUrl,            setBudgetUrl]            = useState<string | null>(deal.budget_url)

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const days  = getDaysAgo(deal.last_activity_at)

  async function handleGenerateProposal(e: React.MouseEvent) {
    e.stopPropagation()
    setIsGeneratingProposal(true)
    try {
      await fetch('/api/pipeline/generate-proposal', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ dealId: deal.id }),
      })
      setTimeout(() => window.location.reload(), 12000)
    } catch {
      setIsGeneratingProposal(false)
    }
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...listeners}
        {...attributes}
        className={cn(
          'bg-white rounded-lg p-3 shadow-sm border border-gray-100',
          'cursor-grab active:cursor-grabbing select-none touch-none',
          isDragging && 'opacity-30',
          isOverlay  && 'shadow-xl rotate-1 cursor-grabbing opacity-100'
        )}
      >
        {/* Título */}
        <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">
          {deal.title}
        </p>

        {/* Contacto */}
        {deal.contacts && (
          <p className="text-xs text-gray-500 mt-1 truncate">
            {deal.contacts.name}
            {deal.contacts.company && (
              <span className="text-gray-400"> · {deal.contacts.company}</span>
            )}
          </p>
        )}

        {/* Presupuesto PDF — solo en etapa "Contactado" */}
        {!isOverlay && deal.stage === 'Contactado' && (
          <div className="mt-2" onPointerDown={(e) => e.stopPropagation()}>
            {budgetUrl ? (
              <a
                href={budgetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-violet-600 hover:text-violet-800 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Ver presupuesto PDF
              </a>
            ) : (
              <button
                onClick={() => setBudgetModalOpen(true)}
                className="text-xs text-violet-500 hover:text-violet-700 font-medium underline underline-offset-2"
              >
                Generar presupuesto
              </button>
            )}
          </div>
        )}

        {/* Propuesta PDF — solo en etapa "Cerrado ganado" */}
        {!isOverlay && deal.stage === 'Cerrado ganado' && (
          <div className="mt-2" onPointerDown={(e) => e.stopPropagation()}>
            {deal.proposal_url ? (
              <a
                href={deal.proposal_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M12 10v6m0 0l-3-3m3 3l3-3M3 17V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                </svg>
                Ver propuesta PDF
              </a>
            ) : isGeneratingProposal ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
                <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Generando PDF…
              </span>
            ) : (
              <button
                onClick={handleGenerateProposal}
                className="text-xs text-indigo-500 hover:text-indigo-700 font-medium underline underline-offset-2"
              >
                Generar propuesta PDF
              </button>
            )}
          </div>
        )}

        {/* Metadatos: videos + forma de pago */}
        {(deal.cantidad_videos || deal.forma_pago) && (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
            {deal.cantidad_videos && (
              <span className="text-xs text-gray-400">
                {deal.cantidad_videos} vídeo{deal.cantidad_videos !== 1 ? 's' : ''}
              </span>
            )}
            {deal.forma_pago && (
              <span className="text-xs text-gray-400">
                {deal.forma_pago.startsWith('Upfront') ? 'Upfront' : '50/50'}
              </span>
            )}
          </div>
        )}

        {/* Footer: valor + días */}
        <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
          <span className="text-sm font-semibold text-gray-800">
            {deal.value > 0
              ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(deal.value)
              : '—'}
          </span>
          <span className={cn(
            'text-xs px-1.5 py-0.5 rounded-full font-medium',
            days === 0  ? 'bg-green-100 text-green-700'
            : days <= 7  ? 'bg-gray-100 text-gray-500'
            : days <= 14 ? 'bg-amber-100 text-amber-700'
            :              'bg-red-100 text-red-700'
          )}>
            {days === 0 ? 'Hoy' : `${days}d`}
          </span>
        </div>
      </div>

      {/* Modal fuera del div draggable para evitar conflictos con dnd-kit */}
      {!isOverlay && deal.stage === 'Contactado' && (
        <BudgetModal
          dealId={deal.id}
          dealTitle={deal.title}
          open={budgetModalOpen}
          onOpenChange={setBudgetModalOpen}
          onSuccess={(url) => setBudgetUrl(url)}
        />
      )}
    </>
  )
}
