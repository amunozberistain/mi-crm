'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types'

interface Props {
  deal: Deal
  isOverlay?: boolean  // true cuando se usa en el DragOverlay
}

function getDaysAgo(dateStr: string): number {
  const diff = Date.now() - new Date(dateStr).getTime()
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function DealCard({ deal, isOverlay = false }: Props) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: deal.id,
    disabled: isOverlay,
  })

  // transform es un objeto {x, y} que dnd-kit actualiza en tiempo real
  // CSS.Translate lo convierte a "translate3d(x, y, 0)" para mover el card
  const style = transform ? { transform: CSS.Translate.toString(transform) } : undefined

  const days = getDaysAgo(deal.last_activity_at)

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'bg-white rounded-lg p-3 shadow-sm border border-gray-100',
        'cursor-grab active:cursor-grabbing select-none touch-none',
        // Cuando se está arrastrando, el original queda semitransparente
        isDragging && 'opacity-30',
        // El overlay rota ligeramente para dar sensación de "levantado"
        isOverlay && 'shadow-xl rotate-1 cursor-grabbing opacity-100'
      )}
    >
      {/* Título */}
      <p className="font-medium text-gray-900 text-sm leading-snug line-clamp-2">
        {deal.title}
      </p>

      {/* Contacto y empresa */}
      {deal.contacts && (
        <p className="text-xs text-gray-500 mt-1 truncate">
          {deal.contacts.name}
          {deal.contacts.company && (
            <span className="text-gray-400"> · {deal.contacts.company}</span>
          )}
        </p>
      )}

      {/* Footer: valor económico + días desde último movimiento */}
      <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-gray-50">
        <span className="text-sm font-semibold text-gray-800">
          {deal.value > 0
            ? new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(deal.value)
            : '—'}
        </span>

        {/* Color del badge según antigüedad: verde < 7d, ámbar 7-14d, rojo > 14d */}
        <span
          className={cn(
            'text-xs px-1.5 py-0.5 rounded-full font-medium',
            days === 0
              ? 'bg-green-100 text-green-700'
              : days <= 7
              ? 'bg-gray-100 text-gray-500'
              : days <= 14
              ? 'bg-amber-100 text-amber-700'
              : 'bg-red-100 text-red-700'
          )}
        >
          {days === 0 ? 'Hoy' : `${days}d`}
        </span>
      </div>
    </div>
  )
}
