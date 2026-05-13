'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'
import type { Deal } from '@/types'
import DealCard from './deal-card'

interface Props {
  stage:       string
  deals:       Deal[]
  onAddDeal:   () => void
  onCardClick: (dealId: string) => void
}

const STAGE_DOT: Record<string, string> = {
  'Nuevo lead':      'bg-[#C4A882]',
  'Contactado':      'bg-[#7BA3B8]',
  'Follow up 1':     'bg-[#9B8EC4]',
  'Follow up 2':     'bg-[#C4A35A]',
  'Cerrado ganado':  'bg-[#6E9E6B]',
  'Cerrado perdido': 'bg-[#C47878]',
}

export default function KanbanColumn({ stage, deals, onAddDeal, onCardClick }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  const dot = STAGE_DOT[stage] ?? 'bg-[#C4A882]'
  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <div className="flex flex-col w-64 flex-shrink-0">
      {/* Cabecera de columna */}
      <div className="flex items-center justify-between mb-2.5 px-1">
        <div className="flex items-center gap-2">
          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', dot)} />
          <span className="font-display text-sm font-semibold text-[#2C1810]">{stage}</span>
          <span className="text-xs font-medium bg-[#D4C5B0]/60 text-[#5C3D2E] px-1.5 py-0.5 rounded-full">
            {deals.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          {totalValue > 0 && (
            <span className="text-xs text-[#8B6F5E] font-medium">
              {new Intl.NumberFormat('es-ES', {
                style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
              }).format(totalValue)}
            </span>
          )}
          <button
            onClick={onAddDeal}
            className="w-6 h-6 flex items-center justify-center rounded-md text-[#8B6F5E] hover:bg-[#D4C5B0]/60 hover:text-[#5C3D2E] transition-colors"
            title={`Añadir deal en ${stage}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Zona de drop */}
      <div
        ref={setNodeRef}
        className={cn(
          'flex-1 rounded-xl p-2 space-y-2 min-h-[480px] transition-all duration-150 bg-[#EDE8DF]',
          isOver && 'ring-2 ring-[#5C3D2E]/40 ring-inset'
        )}
      >
        {deals.map((deal) => (
          <DealCard key={deal.id} deal={deal} onCardClick={onCardClick} />
        ))}

        {deals.length === 0 && !isOver && (
          <p className="text-center text-xs text-[#8B6F5E]/60 pt-8">Sin deals</p>
        )}
      </div>
    </div>
  )
}
