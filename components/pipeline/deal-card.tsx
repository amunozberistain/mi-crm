'use client'

import { useRef } from 'react'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types'

interface Props {
  deal:         Deal
  isOverlay?:   boolean
  onCardClick?: (dealId: string) => void
}

function getDaysAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24))
}

export default function DealCard({ deal, isOverlay = false, onCardClick }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id:       deal.id,
    disabled: isOverlay,
  })

  const pointerStart = useRef<{ x: number; y: number } | null>(null)

  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined
  const days  = getDaysAgo(deal.last_activity_at)

  function handlePointerDown(e: React.PointerEvent) {
    pointerStart.current = { x: e.clientX, y: e.clientY }
    ;(listeners as { onPointerDown?: React.PointerEventHandler })?.onPointerDown?.(e)
  }

  function handlePointerUp(e: React.PointerEvent) {
    if (!pointerStart.current || isOverlay) return
    const dx = e.clientX - pointerStart.current.x
    const dy = e.clientY - pointerStart.current.y
    pointerStart.current = null
    if (dx * dx + dy * dy < 25 && !isDragging) {
      onCardClick?.(deal.id)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className={cn(
        'bg-white rounded-lg p-3.5 border border-[#D4C5B0]',
        'cursor-grab active:cursor-grabbing select-none touch-none',
        isDragging && 'opacity-30',
        isOverlay  && 'shadow-xl rotate-1 cursor-grabbing opacity-100',
        !isOverlay && 'hover:border-[#5C3D2E]/30 hover:shadow-md transition-all'
      )}
    >
      {/* Título */}
      <p className="font-medium text-[#2C1810] text-sm leading-snug line-clamp-2">
        {deal.title}
      </p>

      {/* Contacto */}
      {deal.contacts && (
        <p className="text-xs text-[#8B6F5E] mt-1 truncate">
          {deal.contacts.name}
          {deal.contacts.company && (
            <span className="text-[#8B6F5E]/60"> · {deal.contacts.company}</span>
          )}
        </p>
      )}

      {/* PDF badges */}
      {!isOverlay && (deal.budget_url || deal.proposal_url) && (
        <div
          className="flex flex-wrap gap-x-2 mt-2"
          onPointerDown={(e) => e.stopPropagation()}
          onPointerUp={(e) => e.stopPropagation()}
        >
          {deal.budget_url && (
            <a
              href={deal.budget_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#5C3D2E] hover:text-[#4A3024] font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Presupuesto
            </a>
          )}
          {deal.proposal_url && (
            <a
              href={deal.proposal_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-[#8B6F5E] hover:text-[#5C3D2E] font-medium"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Propuesta
            </a>
          )}
        </div>
      )}

      {/* Metadatos */}
      {(deal.cantidad_videos || deal.forma_pago) && (
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
          {deal.cantidad_videos && (
            <span className="text-xs text-[#8B6F5E]/70">
              {deal.cantidad_videos} vídeo{deal.cantidad_videos !== 1 ? 's' : ''}
            </span>
          )}
          {deal.forma_pago && (
            <span className="text-xs text-[#8B6F5E]/70">
              {deal.forma_pago.startsWith('Upfront') ? 'Upfront' : '50/50'}
            </span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-[#F5F0E8]">
        <span className="text-sm font-semibold text-[#2C1810]">
          {deal.value > 0
            ? new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(deal.value)
            : '—'}
        </span>
        <span className={cn(
          'text-xs px-1.5 py-0.5 rounded-full font-medium',
          days === 0  ? 'bg-[#D4F0D4] text-[#2D6A2D]'
          : days <= 7  ? 'bg-[#EDE8DF] text-[#8B6F5E]'
          : days <= 14 ? 'bg-[#FBF0DC] text-[#8B6020]'
          :              'bg-[#FADDDD] text-[#8B2020]'
        )}>
          {days === 0 ? 'Hoy' : `${days}d`}
        </span>
      </div>
    </div>
  )
}
