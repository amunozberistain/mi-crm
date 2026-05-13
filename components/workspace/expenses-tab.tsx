'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createExpense, updateExpense, deleteExpense } from '@/app/(dashboard)/workspace/actions'
import type { Expense } from '@/types'

const DEFAULT_CATEGORIES = ['Marketing', 'Software', 'Personal', 'Operaciones', 'Otros']

const FREQUENCY_LABELS: Record<string, string> = {
  monthly:   'Mensual',
  quarterly: 'Trimestral',
  yearly:    'Anual',
}

interface Props {
  expenses:    Expense[]
  setExpenses: React.Dispatch<React.SetStateAction<Expense[]>>
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
}

type ExpenseForm = {
  concept: string
  category: string
  amount: string
  date: string
  recurring: boolean
  recurring_frequency: 'monthly' | 'quarterly' | 'yearly'
}

const emptyForm: ExpenseForm = {
  concept:             '',
  category:            DEFAULT_CATEGORIES[0],
  amount:              '',
  date:                new Date().toISOString().slice(0, 10),
  recurring:           false,
  recurring_frequency: 'monthly',
}

type PendingData = {
  concept: string; category: string; amount: number; date: string; recurring_frequency?: string
}

export default function ExpensesTab({ expenses, setExpenses }: Props) {
  const [filterCat,   setFilterCat]   = useState<string>('all')
  const [modalOpen,   setModalOpen]   = useState(false)
  const [editingId,   setEditingId]   = useState<string | null>(null)
  const [form,        setForm]        = useState<ExpenseForm>(emptyForm)
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)
  const [scopeStep,   setScopeStep]   = useState(false)
  const [pendingData, setPendingData] = useState<PendingData | null>(null)

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
    setScopeStep(false)
    setPendingData(null)
    setModalOpen(true)
  }

  function openEdit(exp: Expense) {
    setEditingId(exp.id)
    setForm({
      concept:             exp.concept,
      category:            exp.category,
      amount:              String(exp.amount),
      date:                exp.date,
      recurring:           exp.recurring,
      recurring_frequency: (exp.recurring_frequency as 'monthly' | 'quarterly' | 'yearly') ?? 'monthly',
    })
    setError(null)
    setScopeStep(false)
    setPendingData(null)
    setModalOpen(true)
  }

  function closeModal() {
    if (saving) return
    setModalOpen(false)
    setScopeStep(false)
    setPendingData(null)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const amount = parseFloat(form.amount.replace(',', '.'))
    if (!form.concept.trim())                   { setError('El concepto es obligatorio'); return }
    if (!form.category.trim())                  { setError('La categoría es obligatoria'); return }
    if (isNaN(amount) || amount <= 0)           { setError('El importe debe ser un número positivo'); return }
    if (!form.date)                             { setError('La fecha es obligatoria'); return }

    const data: PendingData = {
      concept:             form.concept.trim(),
      category:            form.category.trim(),
      amount,
      date:                form.date,
      recurring_frequency: form.recurring ? form.recurring_frequency : undefined,
    }

    // ── Create ──
    if (!editingId) {
      setSaving(true)
      setError(null)
      try {
        await createExpense({ ...data, recurring: form.recurring })
        setExpenses(prev => [{
          id:                  crypto.randomUUID(),
          user_id:             '',
          created_at:          new Date().toISOString(),
          recurring:           form.recurring,
          recurring_frequency: form.recurring ? form.recurring_frequency : null,
          recurring_parent_id: null,
          concept:             data.concept,
          category:            data.category,
          amount:              data.amount,
          date:                data.date,
        }, ...prev])
        setModalOpen(false)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al guardar')
      } finally {
        setSaving(false)
      }
      return
    }

    // ── Edit recurring → scope step ──
    const editingExpense = expenses.find(e => e.id === editingId)
    if (editingExpense?.recurring) {
      setPendingData(data)
      setScopeStep(true)
      return
    }

    // ── Edit non-recurring → save directly ──
    setSaving(true)
    setError(null)
    try {
      await updateExpense(editingId, data)
      setExpenses(prev => prev.map(e => e.id === editingId ? { ...e, ...data } : e))
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function commitUpdate(scope: 'this' | 'all_future') {
    if (!editingId || !pendingData) return
    setSaving(true)
    setError(null)
    try {
      await updateExpense(editingId, pendingData, scope)
      if (scope === 'all_future') {
        const expense  = expenses.find(e => e.id === editingId)
        const parentId = expense?.recurring_parent_id ?? editingId
        const today    = new Date().toISOString().slice(0, 10)
        setExpenses(prev => prev.map(e => {
          if (e.id === parentId)                                        return { ...e, ...pendingData }
          if (e.recurring_parent_id === parentId && e.date >= today)   return { ...e, ...pendingData }
          return e
        }))
      } else {
        setExpenses(prev => prev.map(e => e.id === editingId ? { ...e, ...pendingData } : e))
      }
      setScopeStep(false)
      setPendingData(null)
      setModalOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string, scope: 'this' | 'all_future' = 'this') {
    setConfirmDel(null)
    const expense = expenses.find(e => e.id === id)

    if (scope === 'all_future' && expense?.recurring) {
      const parentId = expense.recurring_parent_id ?? id
      const today    = new Date().toISOString().slice(0, 10)
      setExpenses(prev => prev.filter(e => {
        if (e.id === parentId)                                        return false
        if (e.recurring_parent_id === parentId && e.date >= today)   return false
        return true
      }))
    } else {
      setExpenses(prev => prev.filter(e => e.id !== id))
    }

    try {
      await deleteExpense(id, scope)
    } catch {
      // revalidatePath will resync on next navigation
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
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
                <td className="px-5 py-3 font-medium text-[#2C1810]">
                  <div className="flex items-center gap-2 flex-wrap">
                    {exp.concept}
                    {exp.recurring && exp.recurring_frequency && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide bg-[#5C3D2E]/10 text-[#5C3D2E]">
                        <svg className="w-2.5 h-2.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        {FREQUENCY_LABELS[exp.recurring_frequency] ?? exp.recurring_frequency}
                      </span>
                    )}
                  </div>
                </td>
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
                      exp.recurring ? (
                        <div className="flex items-center gap-1 text-xs">
                          <button
                            onClick={() => handleDelete(exp.id, 'this')}
                            className="font-medium text-[#8B6F5E] hover:text-[#2C1810] whitespace-nowrap"
                          >
                            Solo este
                          </button>
                          <span className="text-[#D4C5B0]">·</span>
                          <button
                            onClick={() => handleDelete(exp.id, 'all_future')}
                            className="font-medium text-red-600 hover:text-red-800 whitespace-nowrap"
                          >
                            Serie
                          </button>
                          <span className="text-[#D4C5B0]">·</span>
                          <button
                            onClick={() => setConfirmDel(null)}
                            className="text-[#8B6F5E] hover:text-[#2C1810]"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(exp.id, 'this')}
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
                      )
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
      <Dialog open={modalOpen} onOpenChange={v => { if (!v) closeModal() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold text-[#2C1810]">
              {editingId ? 'Editar gasto' : 'Nuevo gasto'}
            </DialogTitle>
          </DialogHeader>

          {scopeStep ? (
            /* ── Scope selection ── */
            <div className="mt-4 space-y-4">
              <p className="text-sm text-[#2C1810]">¿Cómo quieres aplicar los cambios?</p>
              {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => commitUpdate('this')}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 rounded-lg border border-[#D4C5B0] hover:bg-[#EDE8DF] transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-[#2C1810]">Solo este mes</span>
                  <span className="block text-xs text-[#8B6F5E] mt-0.5">Modifica únicamente esta instancia</span>
                </button>
                <button
                  onClick={() => commitUpdate('all_future')}
                  disabled={saving}
                  className="w-full text-left px-4 py-3 rounded-lg border border-[#D4C5B0] hover:bg-[#EDE8DF] transition-colors disabled:opacity-50"
                >
                  <span className="text-sm font-semibold text-[#2C1810]">Este y todos los futuros</span>
                  <span className="block text-xs text-[#8B6F5E] mt-0.5">Actualiza la serie completa a partir de hoy</span>
                </button>
                <button
                  onClick={() => { setScopeStep(false); setPendingData(null) }}
                  disabled={saving}
                  className="text-sm text-[#8B6F5E] hover:text-[#2C1810] text-center py-1 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            /* ── Form ── */
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

              {/* Recurring toggle */}
              <div className="space-y-2.5">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={form.recurring}
                    onClick={() => setForm(f => ({ ...f, recurring: !f.recurring }))}
                    className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C3D2E]/40 ${
                      form.recurring ? 'bg-[#5C3D2E]' : 'bg-[#D4C5B0]'
                    }`}
                  >
                    <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                      form.recurring ? 'translate-x-4' : 'translate-x-0'
                    }`} />
                  </button>
                  <span className="text-sm font-medium text-[#2C1810]">Recurrente</span>
                </label>

                {form.recurring && (
                  <div className="pl-11">
                    <select
                      value={form.recurring_frequency}
                      onChange={e => setForm(f => ({ ...f, recurring_frequency: e.target.value as 'monthly' | 'quarterly' | 'yearly' }))}
                      className="rounded-md border border-[#D4C5B0] px-3 py-1.5 text-sm text-[#2C1810] bg-white focus:outline-none focus:ring-2 focus:ring-[#5C3D2E]/40"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="quarterly">Trimestral</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                )}
              </div>

              {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <Button type="button" variant="outline" onClick={closeModal}>Cancelar</Button>
                <Button type="submit" disabled={saving} className="bg-[#5C3D2E] hover:bg-[#4A3024] text-white">
                  {saving ? 'Guardando…' : editingId ? 'Actualizar' : 'Añadir gasto'}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
