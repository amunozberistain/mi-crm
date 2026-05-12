'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types'
import DealCard from './deal-card'

interface Props {
  stage: string
  deals: Deal[]
  onAddDeal: () => void
}

const STAGE_STYLES: Record<string, { dot: string; bg: string }> = {
  'Nuevo lead': { dot: 'bg-gray-400',   bg: 'bg-gray-50'    },
  'Contactado': { dot: 'bg-blue-500',   bg: 'bg-blue-50'    },
  'Demo':       { dot: 'bg-violet-500', bg: 'bg-violet-50'  },
  'Propuesta':  { dot: 'bg-amber-500',  bg: 'bg-amber-50'   },
  'Cerrado':    { dot: 'bg-green-500',  bg: 'bg-green-50'   },
}

export default function KanbanColumn({ stage, deals, onAddDeal }: Props) {
  // isOver es true cuando hay un card siendo arrastrado encima de esta columna
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const style = STAGE_STYLES[stage] ?? { dot: 'bg-gray-400', bg: 'bg-gray-50' }
  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Cabecera de la columna */}
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', style.dot)} />
          <span className="text-sm font-semibold text-gray-700">{stage}</span>
          <span className="text-xs font-medium bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {totalValue > 0 && (
            <span className="text-xs text-gray-400 font-medium">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency',
                currency: 'EUR',
                maximumFractionDigits: 0,
              }).format(totalValue)}
            </span>
          )}
          {/* Botón "+" para crear un deal directamente en esta etapa */}
          <button
            onClick={onAddDeal}
            className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
            title={`Añadir deal en ${stage}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Zona de drop: se ilumina con un anillo índigo cuando hay un card encima */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 space-y-2 min-h-[480px] transition-all duration-150',
          style.bg,
          isOver && 'ring-2 ring-indigo-400 ring-inset'
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} />
        ))}

        {deals.length === 0 && !isOver && (
          <p className="text-center text-xs text-gray-400 pt-8">Sin deals</p>
        )}
      </div>
    </div>
  )
}
