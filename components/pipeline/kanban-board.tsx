'use client'

import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { Contact, Deal } from '@/types'
import KanbanColumn from './kanban-column'
import DealCard from './deal-card'
import DealPanel from './deal-panel'
import NewDealDialog from './new-deal-dialog'
import { updateDealStage } from '@/app/(dashboard)/pipeline/actions'

interface Props {
  deals:    Deal[]
  stages:   string[]
  contacts: Pick<Contact, 'id' | 'name' | 'company'>[]
}

export default function KanbanBoard({ deals: initialDeals, stages, contacts }: Props) {
  const [deals,      setDeals]      = useState<Deal[]>(initialDeals)
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null)
  const [panelDeal,  setPanelDeal]  = useState<Deal | null>(null)

  const [dialogOpen,  setDialogOpen]  = useState(false)
  const [dialogStage, setDialogStage] = useState(stages[0])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  function openDialog(stage: string) {
    setDialogStage(stage)
    setDialogOpen(true)
  }

  function openPanel(dealId: string) {
    const deal = deals.find(d => d.id === dealId)
    if (deal) setPanelDeal(deal)
  }

  function handleDealUpdated(dealId: string, updates: Partial<Deal>) {
    setDeals(prev => prev.map(d => d.id === dealId ? { ...d, ...updates } : d))
    setPanelDeal(prev => prev?.id === dealId ? { ...prev, ...updates } : prev)
  }

  function handleDealDeleted(dealId: string) {
    setDeals(prev => prev.filter(d => d.id !== dealId))
    setPanelDeal(null)
  }

  function handleDragStart({ active }: DragStartEvent) {
    setActiveDeal(deals.find((d) => d.id === active.id) ?? null)
  }

  async function handleDragEnd({ active, over }: DragEndEvent) {
    setActiveDeal(null)
    if (!over) return
    const newStage = over.id as string
    const dragged = deals.find((d) => d.id === active.id)
    if (!dragged || dragged.stage === newStage) return

    setDeals(prev =>
      prev.map(d =>
        d.id === active.id
          ? { ...d, stage: newStage, last_activity_at: new Date().toISOString() }
          : d
      )
    )
    if (panelDeal?.id === active.id) {
      setPanelDeal(prev => prev ? { ...prev, stage: newStage } : prev)
    }
    try {
      await updateDealStage(active.id as string, newStage)
    } catch {
      setDeals(initialDeals)
    }
  }

  const totalDeals = deals.length
  const totalValue = deals.reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <>
      {/* Cabecera */}
      <div className="flex items-start justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#2C1810] leading-tight">
            Pipeline
          </h1>
          <p className="text-sm text-[#8B6F5E] mt-1">
            {totalDeals} deal{totalDeals !== 1 ? 's' : ''} &middot;{' '}
            {new Intl.NumberFormat('es-ES', {
              style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
            }).format(totalValue)}{' '}
            en total
          </p>
        </div>
        <button
          onClick={() => openDialog(stages[0])}
          className="flex items-center gap-2 bg-[#5C3D2E] hover:bg-[#4A3024] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nuevo deal
        </button>
      </div>

      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex gap-4 overflow-x-auto pb-4">
          {stages.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              deals={deals.filter((d) => d.stage === stage)}
              onAddDeal={() => openDialog(stage)}
              onCardClick={openPanel}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDeal ? <DealCard deal={activeDeal} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      <NewDealDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        contacts={contacts}
        defaultStage={dialogStage}
      />

      {panelDeal && (
        <DealPanel
          deal={panelDeal}
          contacts={contacts}
          onClose={() => setPanelDeal(null)}
          onDealUpdated={handleDealUpdated}
          onDealDeleted={handleDealDeleted}
        />
      )}
    </>
  )
}
