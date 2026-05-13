'use client'

import { useState } from 'react'
import { updateInvoice } from '@/app/(dashboard)/workspace/actions'
import type { DealWithContact } from '@/app/(dashboard)/workspace/page'

interface Props {
  wonDeals:    DealWithContact[]
  setWonDeals: React.Dispatch<React.SetStateAction<DealWithContact[]>>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

function InlineAmount({ deal, onSave }: {
  deal: DealWithContact
  onSave: (amount: number | null) => void
}) {
  const displayed = deal.invoice_amount ?? deal.value ?? 0
  const [editing, setEditing] = useState(false)
  const [val,     setVal]     = useState(String(displayed))

  function commit() {
    setEditing(false)
    const parsed = parseFloat(val.replace(',', '.'))
    if (!isNaN(parsed) && parsed !== displayed) {
      onSave(parsed)
    }
  }

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false) }}
        className="w-28 rounded border border-[#D4C5B0] px-2 py-1 text-sm text-[#2C1810] focus:outline-none focus:ring-2 focus:ring-[#5C3D2E]/40"
      />
    )
  }

  return (
    <button
      onClick={() => { setVal(String(displayed)); setEditing(true) }}
      className="font-semibold text-[#2C1810] hover:text-[#5C3D2E] transition-colors text-sm"
      title="Clic para editar importe"
    >
      {fmt(displayed)}
    </button>
  )
}

export default function BillingTab({ wonDeals, setWonDeals }: Props) {

  function updateDeal(id: string, patch: Partial<DealWithContact>) {
    setWonDeals(prev => prev.map(d => d.id === id ? { ...d, ...patch } : d))
  }

  async function handleAmountChange(deal: DealWithContact, amount: number | null) {
    updateDeal(deal.id, { invoice_amount: amount })
    try {
      await updateInvoice(deal.id, { invoice_amount: amount })
    } catch {
      updateDeal(deal.id, { invoice_amount: deal.invoice_amount })
    }
  }

  async function handlePaidToggle(deal: DealWithContact) {
    const next = !deal.invoice_paid
    const paidAt = next ? (new Date().toISOString().slice(0, 10)) : null
    updateDeal(deal.id, { invoice_paid: next, invoice_paid_at: paidAt })
    try {
      await updateInvoice(deal.id, { invoice_paid: next, invoice_paid_at: paidAt })
    } catch {
      updateDeal(deal.id, { invoice_paid: deal.invoice_paid, invoice_paid_at: deal.invoice_paid_at })
    }
  }

  async function handleDateChange(deal: DealWithContact, date: string) {
    updateDeal(deal.id, { invoice_paid_at: date || null })
    try {
      await updateInvoice(deal.id, { invoice_paid_at: date || null })
    } catch {
      updateDeal(deal.id, { invoice_paid_at: deal.invoice_paid_at })
    }
  }

  const totalFacturado = wonDeals.reduce((s, d) => s + (d.invoice_amount ?? d.value ?? 0), 0)
  const totalCobrado   = wonDeals.filter(d => d.invoice_paid).reduce((s, d) => s + (d.invoice_amount ?? d.value ?? 0), 0)
  const totalPendiente = totalFacturado - totalCobrado

  return (
    <div className="flex flex-col gap-5">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total facturado',  value: fmt(totalFacturado), dot: 'bg-[#5C3D2E]'  },
          { label: 'Total cobrado',    value: fmt(totalCobrado),   dot: 'bg-[#6E9E6B]'  },
          { label: 'Total pendiente',  value: fmt(totalPendiente), dot: 'bg-[#C4A35A]'  },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl border border-[#D4C5B0] p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${card.dot}`} />
              <p className="text-xs font-semibold uppercase tracking-wide text-[#8B6F5E]">{card.label}</p>
            </div>
            <p className="font-display text-2xl font-semibold text-[#2C1810]">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#D4C5B0] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#EDE8DF] border-b border-[#D4C5B0]">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Proyecto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Contacto</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Importe</th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Estado</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Fecha de cobro</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4C5B0]/40">
            {wonDeals.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-[#8B6F5E]/60">
                  Aún no hay deals cerrados ganados.
                </td>
              </tr>
            ) : wonDeals.map(deal => (
              <tr key={deal.id} className="hover:bg-[#F5F0E8] transition-colors">
                <td className="px-5 py-3 font-medium text-[#2C1810]">
                  {deal.title}
                </td>
                <td className="px-4 py-3 text-[#8B6F5E]">
                  {deal.contacts ? (
                    <span>
                      {deal.contacts.name}
                      {deal.contacts.company && (
                        <span className="text-[#8B6F5E]/60"> · {deal.contacts.company}</span>
                      )}
                    </span>
                  ) : <span className="text-[#D4C5B0]">—</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <InlineAmount deal={deal} onSave={amount => handleAmountChange(deal, amount)} />
                </td>
                <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => handlePaidToggle(deal)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                      deal.invoice_paid
                        ? 'bg-[#D4F0D4] text-[#2D6A2D] hover:bg-[#C0E8C0]'
                        : 'bg-[#FBF0DC] text-[#8B6020] hover:bg-[#F5E5C0]'
                    }`}
                  >
                    {deal.invoice_paid ? (
                      <>
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                        Pagado
                      </>
                    ) : 'Pendiente'}
                  </button>
                </td>
                <td className="px-5 py-3" onClick={e => e.stopPropagation()}>
                  {deal.invoice_paid ? (
                    <input
                      type="date"
                      value={deal.invoice_paid_at ?? ''}
                      onChange={e => handleDateChange(deal, e.target.value)}
                      className="text-sm text-[#8B6F5E] border border-[#D4C5B0] rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#5C3D2E]/40 bg-white"
                    />
                  ) : (
                    <span className="text-[#D4C5B0]">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
