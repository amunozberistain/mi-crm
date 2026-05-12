'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDeal } from '@/app/(dashboard)/pipeline/actions'
import { PIPELINE_STAGES } from '@/lib/constants'
import type { Contact } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Pick<Contact, 'id' | 'name' | 'company'>[]
  defaultStage?: string
}

export default function NewDealDialog({ open, onOpenChange, contacts = [], defaultStage = 'Nuevo lead' }: Props) {
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      await createDeal(new FormData(e.currentTarget))
      formRef.current?.reset()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nuevo deal</DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-2">
          {/* Título — obligatorio */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-title">Título *</Label>
            <Input
              id="deal-title"
              name="title"
              placeholder="Proyecto web Acme S.L."
              required
            />
          </div>

          {/* Contacto — select con los contactos existentes */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-contact">Contacto</Label>
            <select
              id="deal-contact"
              name="contact_id"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="">Sin contacto</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Etapa — pre-selecciona la columna desde la que se abrió el diálogo */}
          <div className="space-y-1.5">
            <Label htmlFor="deal-stage">Etapa</Label>
            <select
              id="deal-stage"
              name="stage"
              defaultValue={defaultStage}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Valor + probabilidad en la misma fila */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-value">Valor (€)</Label>
              <Input
                id="deal-value"
                name="value"
                type="number"
                min="0"
                step="100"
                placeholder="5000"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-prob">Probabilidad (%)</Label>
              <Input
                id="deal-prob"
                name="probability"
                type="number"
                min="0"
                max="100"
                placeholder="50"
              />
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isPending ? 'Guardando…' : 'Crear deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
