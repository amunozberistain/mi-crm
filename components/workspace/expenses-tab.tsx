'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createExpense, updateExpense, deleteExpense } from '@/app/(dashboard)/workspace/actions'
import type { Expense } from '@/types'

const DEFAULT_CATEGORIES = ['Marketing', 'Software', 'Personal', 'Operaciones', 'Otros']

interface Props {
  expenses:    Expense[]
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

type ExpenseForm = { concept: string; category: string; amount: string; date: string }

const emptyForm: ExpenseForm = {
  concept:  '',
  category: DEFAULT_CATEGORIES[0],
  amount:   '',
  date:     new Date().toISOString().slice(0, 10),
}

export default function ExpensesTab({ expenses, setExpenses }: Props) {
  const [filterCat, setFilterCat] = useState<string>('all')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form,      setForm]      = useState<ExpenseForm>(emptyForm)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)

  // Collect all categories (defaults + any custom ones already in data)
  const allCategories = Array.from(new Set([
    ...DEFAULT_CATEGORIES,
    ...expenses.map(e => e.category),
  ])).sort()

  const filtered = filterCat === 'all'
    ? expenses
    : expenses.filter(e => e.category === filterCat)

  const total = filtered.reduce((s, e) => s + e.amount, 0)

  function openCreate() {
    setEditingId(null)
    setForm(emptyForm)
    setError(null)
    setModalOpen(true)
  }

  function openEdit(exp: Expense) {
    setEditingId(exp.id)
    setForm({
      concept:  exp.concept,
      category: exp.category,
      amount:   String(exp.amount),
      date:     exp.date,
    })
    setError(null)
    setModalOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!form.concept.trim()) { setError('El concepto es obligatorio'); return }
    if (!form.category.trim()) { setError('La categoría es obligatoria'); return }
    if (isNaN(amount) || amount <= 0) { setError('El importe debe ser un número positivo'); return }
    if (!form.date) { setError('La fecha es obligatoria'); return }

    setSaving(true)
    setError(null)
    try {
      const data = {
        concept:  form.concept.trim(),
        category: form.category.trim(),
        amount,
        date: form.date,
      }
      if (editingId) {
        await updateExpense(editingId, data)
        setExpenses(prev => prev.map(e => e.id === editingId ? { ...e, ...data } : e))
      } else {
        await createExpense(data)
        // Re-fetch is handled by revalidatePath — optimistically add a placeholder
        setExpenses(prev => [{
          id: crypto.randomUUID(),
          user_id: '',
          created_at: new Date().toISOString(),
          ...data,
        }, ...prev])
      }
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setExpenses(prev => prev.filter(e => e.id !== id))
    setConfirmDel(null)
    try {
      await deleteExpense(id)
    } catch {
      // revalidatePath will resync on next navigation; optimistic delete is fine
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Category filter */}
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="rounded-lg border border-[#D4C5B0] px-3 py-2 text-sm text-[#2C1810] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D2E]/40"
        >
          <option value="all">Todas las categorías</option>
          {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <button
          onClick={openCreate}
          className="ml-auto flex items-center gap-2 bg-[#5C3D2E] hover:bg-[#4A3024] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Añadir gasto
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-[#D4C5B0] overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-[#EDE8DF] border-b border-[#D4C5B0]">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Concepto</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Categoría</th>
              <th className="px-4 py-3 text-right text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Importe</th>
              <th className="px-5 py-3 text-left text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">Fecha</th>
              <th className="px-4 py-3 w-20" />
            </tr>
          </thead>
          <tbody className="divide-y divide-[#D4C5B0]/40">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-16 text-[#8B6F5E]/60">
                  {filterCat === 'all' ? 'Aún no has registrado gastos.' : `Sin gastos en "${filterCat}".`}
                </td>
              </tr>
            ) : filtered.map(exp => (
              <tr key={exp.id} className="hover:bg-[#F5F0E8] transition-colors">
                <td className="px-5 py-3 font-medium text-[#2C1810]">{exp.concept}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EDE8DF] text-xs font-medium text-[#5C3D2E]">
                    {exp.category}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-[#2C1810]">{fmt(exp.amount)}</td>
                <td className="px-5 py-3 text-[#8B6F5E]">{formatDate(exp.date)}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => openEdit(exp)}
                      className="text-[#8B6F5E] hover:text-[#5C3D2E] transition-colors"
                      title="Editar"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    {confirmDel === exp.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleDelete(exp.id)}
                          className="text-xs font-medium text-red-600 hover:text-red-800"
                        >
                          Sí
                        </button>
                        <button
                          onClick={() => setConfirmDel(null)}
                          className="text-xs text-[#8B6F5E] hover:text-[#2C1810]"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDel(exp.id)}
                        className="text-[#D4C5B0] hover:text-red-500 transition-colors"
                        title="Eliminar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
          {filtered.length > 0 && (
            <tfoot className="border-t border-[#D4C5B0] bg-[#F5F0E8]">
              <tr>
                <td colSpan={2} className="px-5 py-3 text-xs font-semibold text-[#8B6F5E] uppercase tracking-wide">
                  Total{filterCat !== 'all' ? ` · ${filterCat}` : ''}
                </td>
                <td className="px-4 py-3 text-right font-display text-base font-semibold text-[#2C1810]">
                  {fmt(total)}
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Add/Edit modal */}
      <Dialog open={modalOpen} onOpenChange={v => { if (!v && !saving) setModalOpen(false) }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold text-[#2C1810]">
              {editingId ? 'Editar gasto' : 'Nuevo gasto'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="concept">Concepto *</Label>
              <Input
                id="concept"
                value={form.concept}
                onChange={e => setForm(f => ({ ...f, concept: e.target.value }))}
                placeholder="Suscripción Notion, anuncio Meta…"
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="category">Categoría *</Label>
              <input
                id="category"
                list="cat-list"
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Elige o escribe una categoría"
              />
              <datalist id="cat-list">
                {DEFAULT_CATEGORIES.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="amount">Importe (€) *</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="150.00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="exp-date">Fecha *</Label>
                <Input
                  id="exp-date"
                  type="date"
                  value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                  required
                />
              </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={saving} className="bg-[#5C3D2E] hover:bg-[#4A3024] text-white">
                {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Añadir gasto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
