'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateContact, deleteContact } from '@/app/(dashboard)/contacts/actions'
import type { Contact } from '@/types'

interface Props {
  contact:          Contact
  open:             boolean
  onOpenChange:     (open: boolean) => void
  onUpdated:        (updated: Contact) => void
  onContactDeleted: (contactId: string) => void
}

const SOURCE_LABEL: Record<string, string> = {
  meta_lead_ads: 'Meta Lead Ads',
  meta_landing:  'Meta Landing',
  manual:        'Manual',
}

export default function ContactEditModal({ contact, open, onOpenChange, onUpdated, onContactDeleted }: Props) {
  const [name,    setName]    = useState(contact.name)
  const [email,   setEmail]   = useState(contact.email    ?? '')
  const [phone,   setPhone]   = useState(contact.phone    ?? '')
  const [company, setCompany] = useState(contact.company  ?? '')
  const [source,  setSource]  = useState(contact.source   ?? '')
  const [notes,   setNotes]   = useState(contact.notes    ?? '')

  const [isSaving,  setIsSaving]  = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const [confirmDelete, setConfirmDelete] = useState(false)
  const [isDeleting,    setIsDeleting]    = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim() || isSaving) return
    setError(null)
    setIsSaving(true)
    try {
      const data = {
        name:    name.trim(),
        email:   email.trim()   || null,
        phone:   phone.trim()   || null,
        company: company.trim() || null,
        source:  source.trim()  || null,
        notes:   notes.trim()   || null,
      }
      await updateContact(contact.id, data)
      onUpdated({ ...contact, ...data })
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al guardar')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete() {
    setIsDeleting(true)
    try {
      await deleteContact(contact.id)
      onContactDeleted(contact.id)
      onOpenChange(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar')
      setConfirmDelete(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const metaSource = contact.lead_source && contact.lead_source !== 'manual'
    ? SOURCE_LABEL[contact.lead_source] ?? contact.lead_source
    : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar contacto</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label htmlFor="ec-name">Nombre *</Label>
            <Input
              id="ec-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-company">Empresa</Label>
            <Input
              id="ec-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme S.L."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="ec-email">Email</Label>
              <Input
                id="ec-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ana@acme.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ec-phone">Teléfono</Label>
              <Input
                id="ec-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+34 600 000 000"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-source">Fuente</Label>
            <Input
              id="ec-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="LinkedIn, referido, web…"
              disabled={!!metaSource}
            />
            {metaSource && (
              <p className="text-xs text-gray-400">
                Origen automático: <span className="font-medium">{metaSource}</span>
                {contact.utm_campaign && ` · ${contact.utm_campaign}`}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ec-notes">Notas</Label>
            <textarea
              id="ec-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Observaciones, contexto, recordatorios…"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
          )}

          {/* Delete zone */}
          {confirmDelete ? (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 space-y-2">
              <p className="text-sm font-medium text-red-800">¿Eliminar este contacto?</p>
              <p className="text-xs text-red-600">Esta acción no se puede deshacer.</p>
              <div className="flex gap-2 pt-1">
                <Button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs"
                >
                  {isDeleting ? 'Eliminando…' : 'Sí, eliminar contacto'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setConfirmDelete(false)}
                  disabled={isDeleting}
                  className="flex-1 text-xs"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="w-full text-xs text-red-500 hover:text-red-700 font-medium py-1.5 rounded-lg border border-red-100 hover:border-red-300 hover:bg-red-50 transition-colors"
            >
              Eliminar contacto
            </button>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSaving || !name.trim()}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              {isSaving ? 'Guardando…' : 'Guardar cambios'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
