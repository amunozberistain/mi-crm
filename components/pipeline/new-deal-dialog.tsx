'use client'

import { useState, useRef } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createDeal } from '@/app/(dashboard)/pipeline/actions'
import { PIPELINE_STAGES, FORMA_PAGO_OPTIONS } from '@/lib/constants'
import type { Contact } from '@/types'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  contacts: Pick<Contact, 'id' | 'name' | 'company'>[]
  defaultStage?: string
}

const selectCls = 'w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 text-foreground'

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
          <DialogTitle className="font-display text-xl font-semibold text-[#2C1810]">
            Nuevo deal
          </DialogTitle>
        </DialogHeader>

        <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="deal-title">Título *</Label>
            <Input id="deal-title" name="title" placeholder="Proyecto web Acme S.L." required />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-contact">Contacto</Label>
            <select id="deal-contact" name="contact_id" className={selectCls}>
              <option value="">Sin contacto</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}{c.company ? ` · ${c.company}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-stage">Etapa</Label>
            <select id="deal-stage" name="stage" defaultValue={defaultStage} className={selectCls}>
              {PIPELINE_STAGES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="deal-value">Valor (€)</Label>
              <Input id="deal-value" name="value" type="number" min="0" step="100" placeholder="5000" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="deal-videos">Cantidad de videos</Label>
              <Input id="deal-videos" name="cantidad_videos" type="number" min="1" placeholder="3" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deal-forma-pago">Forma de pago</Label>
            <select id="deal-forma-pago" name="forma_pago" className={selectCls}>
              <option value="">Sin especificar</option>
              {FORMA_PAGO_OPTIONS.map((op) => (
                <option key={op} value={op}>{op}</option>
              ))}
            </select>
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
              className="bg-[#5C3D2E] hover:bg-[#4A3024] text-white"
            >
              {isPending ? 'Guardando…' : 'Crear deal'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
