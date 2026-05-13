'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { EVENT_COLORS } from '@/lib/constants'
import type { Activity } from '@/types'

interface Props {
  open:              boolean
  onClose:           () => void
  initialDate?:      Date
  activity?:         Activity
  isGoogleConnected: boolean
  onSave:   (data: SavePayload) => Promise<void>
  onDelete?: () => Promise<void>
}

export interface SavePayload {
  title:        string
  description:  string | null
  start_at:     string
  end_at:       string
  color:        string
  syncToGoogle: boolean
}

function toLocalDatetimeValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultStart(base?: Date): string {
  const d = base ? new Date(base) : new Date()
  const min = d.getMinutes()
  if (min < 30) d.setMinutes(30, 0, 0)
  else { d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1) }
  return toLocalDatetimeValue(d.toISOString())
}

function addHour(datetimeLocal: string): string {
  const d = new Date(datetimeLocal)
  d.setHours(d.getHours() + 1)
  return toLocalDatetimeValue(d.toISOString())
}

export default function EventModal({
  open, onClose, initialDate, activity, isGoogleConnected, onSave, onDelete,
}: Props) {
  const isEdit = !!activity

  const [title,       setTitle]       = useState('')
  const [description, setDescription] = useState('')
  const [startAt,     setStartAt]     = useState(defaultStart(initialDate))
  const [endAt,       setEndAt]       = useState(() => addHour(defaultStart(initialDate)))
  const [color,       setColor]       = useState(EVENT_COLORS[0].value)
  const [syncGoogle,  setSyncGoogle]  = useState(isGoogleConnected)
  const [saving,      setSaving]      = useState(false)
  const [deleting,    setDeleting]    = useState(false)
  const [confirmDel,  setConfirmDel]  = useState(false)
  const [error,       setError]       = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setError(null)
    setConfirmDel(false)
    if (activity) {
      setTitle(activity.title)
      setDescription(activity.description ?? '')
      setStartAt(toLocalDatetimeValue(activity.start_at))
      setEndAt(toLocalDatetimeValue(activity.end_at))
      setColor(activity.color)
      setSyncGoogle(false)
    } else {
      const s = defaultStart(initialDate)
      setTitle('')
      setDescription('')
      setStartAt(s)
      setEndAt(addHour(s))
      setColor(EVENT_COLORS[0].value)
      setSyncGoogle(isGoogleConnected)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  function handleStartChange(val: string) {
    setStartAt(val)
    if (new Date(val) >= new Date(endAt)) {
      setEndAt(addHour(val))
    }
  }

  async function handleSave() {
    if (!title.trim()) { setError('El título es obligatorio'); return }
    if (new Date(startAt) >= new Date(endAt)) { setError('La hora de fin debe ser posterior al inicio'); return }
    setSaving(true)
    setError(null)
    try {
      await onSave({
        title:        title.trim(),
        description:  description.trim() || null,
        start_at:     new Date(startAt).toISOString(),
        end_at:       new Date(endAt).toISOString(),
        color,
        syncToGoogle: syncGoogle,
      })
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!onDelete) return
    setDeleting(true)
    try {
      await onDelete()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
    } finally {
      setDeleting(false)
    }
  }

  const inputCls = 'w-full rounded-lg border border-[#D4C5B0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5C3D2E]/40 bg-white text-[#2C1810] placeholder:text-[#8B6F5E]/50'
  const labelCls = 'block text-xs font-medium text-[#8B6F5E] mb-1'

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v && !saving) onClose() }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-semibold text-[#2C1810]">
            {isEdit ? 'Editar tarea' : 'Nueva tarea'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-1">
          {/* Título */}
          <div>
            <label className={labelCls}>Título *</label>
            <input
              autoFocus
              value={title}
              onChange={e => setTitle(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className={inputCls}
              placeholder="Nombre de la tarea o reunión"
            />
          </div>

          {/* Start / End */}
          <div className="grid grid-cols-2 gap-3">
            {/* Inicio */}
            <div className="space-y-1.5">
              <label className={labelCls}>Inicio</label>
              <input
                type="date"
                value={startAt.slice(0, 10)}
                onChange={e => handleStartChange(`${e.target.value}T${startAt.slice(11, 16)}`)}
                className={inputCls}
              />
              <div className="flex gap-1.5">
                <select
                  value={startAt.slice(11, 13)}
                  onChange={e => handleStartChange(`${startAt.slice(0, 11)}${e.target.value}:${startAt.slice(14, 16)}`)}
                  className={`${inputCls} flex-1`}
                >
                  {Array.from({ length: 24 }, (_, h) => {
                    const v = String(h).padStart(2, '0')
                    return <option key={h} value={v}>{v}</option>
                  })}
                </select>
                <select
                  value={startAt.slice(14, 16)}
                  onChange={e => handleStartChange(`${startAt.slice(0, 14)}${e.target.value}`)}
                  className={`${inputCls} flex-1`}
                >
                  {(() => {
                    const cur = startAt.slice(14, 16)
                    const opts = ['00', '15', '30', '45']
                    if (!opts.includes(cur)) opts.push(cur)
                    return opts.sort().map(m => <option key={m} value={m}>{m}</option>)
                  })()}
                </select>
              </div>
            </div>

            {/* Fin */}
            <div className="space-y-1.5">
              <label className={labelCls}>Fin</label>
              <input
                type="date"
                value={endAt.slice(0, 10)}
                onChange={e => setEndAt(`${e.target.value}T${endAt.slice(11, 16)}`)}
                className={inputCls}
              />
              <div className="flex gap-1.5">
                <select
                  value={endAt.slice(11, 13)}
                  onChange={e => setEndAt(`${endAt.slice(0, 11)}${e.target.value}:${endAt.slice(14, 16)}`)}
                  className={`${inputCls} flex-1`}
                >
                  {Array.from({ length: 24 }, (_, h) => {
                    const v = String(h).padStart(2, '0')
                    return <option key={h} value={v}>{v}</option>
                  })}
                </select>
                <select
                  value={endAt.slice(14, 16)}
                  onChange={e => setEndAt(`${endAt.slice(0, 14)}${e.target.value}`)}
                  className={`${inputCls} flex-1`}
                >
                  {(() => {
                    const cur = endAt.slice(14, 16)
                    const opts = ['00', '15', '30', '45']
                    if (!opts.includes(cur)) opts.push(cur)
                    return opts.sort().map(m => <option key={m} value={m}>{m}</option>)
                  })()}
                </select>
              </div>
            </div>
          </div>

          {/* Color */}
          <div>
            <label className={labelCls}>Color</label>
            <div className="flex gap-2 flex-wrap mt-1">
              {EVENT_COLORS.map(c => (
                <button
                  key={c.value}
                  title={c.label}
                  onClick={() => setColor(c.value)}
                  className="w-6 h-6 rounded-full transition-transform hover:scale-110 focus:outline-none"
                  style={{
                    backgroundColor: c.value,
                    outline: color === c.value ? `3px solid ${c.value}` : undefined,
                    outlineOffset: '2px',
                    boxShadow: color === c.value ? '0 0 0 2px white' : undefined,
                  }}
                />
              ))}
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className={labelCls}>Descripción</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={2}
              className={`${inputCls} resize-none`}
              placeholder="Notas opcionales…"
            />
          </div>

          {/* Google sync */}
          {isGoogleConnected && (
            <label className="flex items-center gap-2.5 cursor-pointer select-none">
              <div
                onClick={() => setSyncGoogle(v => !v)}
                className={`relative w-9 h-5 rounded-full transition-colors ${syncGoogle ? 'bg-[#5C3D2E]' : 'bg-[#D4C5B0]'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${syncGoogle ? 'translate-x-4' : ''}`} />
              </div>
              <span className="text-sm text-[#8B6F5E]">
                {isEdit ? 'Actualizar en Google Calendar' : 'Añadir a Google Calendar'}
              </span>
            </label>
          )}

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            {isEdit && onDelete && (
              confirmDel ? (
                <div className="flex gap-1.5 mr-auto">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-xs font-medium text-red-600 hover:text-red-800 disabled:opacity-50"
                  >
                    {deleting ? 'Eliminando…' : 'Confirmar'}
                  </button>
                  <button onClick={() => setConfirmDel(false)} className="text-xs text-[#8B6F5E] hover:text-[#2C1810]">
                    Cancelar
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDel(true)}
                  className="mr-auto text-xs text-[#D4C5B0] hover:text-red-500 transition-colors"
                  title="Eliminar tarea"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )
            )}
            <button
              onClick={onClose}
              disabled={saving}
              className="ml-auto text-sm text-[#8B6F5E] font-medium px-4 py-2 rounded-lg border border-[#D4C5B0] hover:border-[#5C3D2E]/30 hover:bg-[#F5F0E8] disabled:opacity-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="text-sm font-medium px-4 py-2 rounded-lg text-white disabled:opacity-50 transition-colors"
              style={{ backgroundColor: color }}
            >
              {saving ? 'Guardando…' : isEdit ? 'Actualizar' : 'Crear tarea'}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
