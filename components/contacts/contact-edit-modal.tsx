'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { updateContact } from '@/app/(dashboard)/contacts/actions'
import type { Contact } from '@/types'

interface Props {
  contact:      Contact
  open:         boolean
  onOpenChange: (open: boolean) => void
  onUpdated:    (updated: Contact) => void
}

const SOURCE_LABEL: Record<string, string> = {
  meta_lead_ads: 'Meta Lead Ads',
  meta_landing:  'Meta Landing',
  manual:        'Manual',
}

export default function ContactEditModal({ contact, open, onOpenChange, onUpdated }: Props) {
  const [name,    setName]    = useState(contact.name)
  const [email,   setEmail]   = useState(contact.email    ?? '')
  const [phone,   setPhone]   = useState(contact.phone    ?? '')
  const [company, setCompany] = useState(contact.company  ?? '')
  const [source,  setSource]  = useState(contact.source   ?? '')

  const [isSaving, setIsSaving] = useState(false)
  const [error,    setError]    = useState<string | null>(null)

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

          {error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
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
