'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createContact } from '@/app/(dashboard)/contacts/actions'
import ContactEditModal from './contact-edit-modal'
import type { Contact } from '@/types'

interface Props {
  contacts: Contact[]
}

function LeadSourceBadge({ contact }: { contact: Contact }) {
  if (contact.lead_source === 'meta_lead_ads') {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1 w-fit rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Meta Lead Ads
        </span>
        {contact.utm_campaign && (
          <span className="text-xs text-[#8B6F5E] pl-1">{contact.utm_campaign}</span>
        )}
      </div>
    )
  }
  if (contact.lead_source === 'meta_landing') {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1 w-fit rounded-full bg-[#EDE8DF] px-2 py-0.5 text-xs font-medium text-[#5C3D2E]">
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
          </svg>
          Meta Landing
        </span>
        {contact.utm_campaign && (
          <span className="text-xs text-[#8B6F5E] pl-1">{contact.utm_campaign}</span>
        )}
      </div>
    )
  }
  if (contact.source) {
    return <Badge variant="secondary" className="font-normal">{contact.source}</Badge>
  }
  return <span className="text-[#D4C5B0]">—</span>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function ContactsClient({ contacts: initial }: Props) {
  const [contacts,    setContacts]    = useState<Contact[]>(initial)
  const [search,      setSearch]      = useState('')
  const [createOpen,  setCreateOpen]  = useState(false)
  const [editContact, setEditContact] = useState<Contact | null>(null)
  const [isPending,   setIsPending]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return contacts
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    )
  }, [contacts, search])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      const formData = new FormData(e.currentTarget)
      await createContact(formData)
      formRef.current?.reset()
      setCreateOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsPending(false)
    }
  }

  function handleContactUpdated(updated: Contact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? updated : c))
  }

  function handleContactDeleted(contactId: string) {
    setContacts(prev => prev.filter(c => c.id !== contactId))
    setEditContact(null)
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#2C1810] leading-tight">
            Contactos
          </h1>
          <p className="text-sm text-[#8B6F5E] mt-1">
            {contacts.length} contacto{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={() => { setError(null); setCreateOpen(true) }}
          className="flex items-center gap-2 bg-[#5C3D2E] hover:bg-[#4A3024] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Añadir contacto
        </button>
      </div>

      {/* Modal de nuevo contacto */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold text-[#2C1810]">
              Nuevo contacto
            </DialogTitle>
          </DialogHeader>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-4 mt-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nombre *</Label>
              <Input id="name" name="name" placeholder="Ana García" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company">Empresa</Label>
              <Input id="company" name="company" placeholder="Acme S.L." />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" placeholder="ana@acme.com" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Teléfono</Label>
                <Input id="phone" name="phone" placeholder="+34 600 000 000" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="source">Fuente</Label>
              <Input id="source" name="source" placeholder="LinkedIn, referido, web…" />
            </div>

            {error && (
              <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-[#5C3D2E] hover:bg-[#4A3024] text-white"
              >
                {isPending ? 'Guardando…' : 'Guardar contacto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de edición */}
      {editContact && (
        <ContactEditModal
          contact={editContact}
          open={!!editContact}
          onOpenChange={(v) => { if (!v) setEditContact(null) }}
          onUpdated={handleContactUpdated}
          onContactDeleted={handleContactDeleted}
        />
      )}

      {/* Buscador */}
      <div className="relative max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6F5E]"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <Input
          className="pl-9"
          placeholder="Buscar por nombre, empresa o email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Tabla */}
      <div className="rounded-xl border border-[#D4C5B0] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#EDE8DF] border-b border-[#D4C5B0]">
              <TableHead className="font-semibold text-[#8B6F5E] text-xs uppercase tracking-wide">Nombre</TableHead>
              <TableHead className="font-semibold text-[#8B6F5E] text-xs uppercase tracking-wide">Empresa</TableHead>
              <TableHead className="font-semibold text-[#8B6F5E] text-xs uppercase tracking-wide">Email</TableHead>
              <TableHead className="font-semibold text-[#8B6F5E] text-xs uppercase tracking-wide">Teléfono</TableHead>
              <TableHead className="font-semibold text-[#8B6F5E] text-xs uppercase tracking-wide">Origen</TableHead>
              <TableHead className="font-semibold text-[#8B6F5E] text-xs uppercase tracking-wide">Añadido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-[#8B6F5E]/60">
                  {search
                    ? `Sin resultados para "${search}"`
                    : 'Aún no tienes contactos. ¡Añade el primero!'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((contact) => (
                <TableRow
                  key={contact.id}
                  className="hover:bg-[#F5F0E8] transition-colors cursor-pointer border-b border-[#D4C5B0]/40"
                  onClick={() => setEditContact(contact)}
                >
                  <TableCell className="font-medium text-[#2C1810]">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-[#5C3D2E]/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-[#5C3D2E] text-xs font-semibold">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {contact.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-[#8B6F5E]">
                    {contact.company ?? <span className="text-[#D4C5B0]">—</span>}
                  </TableCell>
                  <TableCell className="text-[#8B6F5E]" onClick={(e) => e.stopPropagation()}>
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="hover:text-[#5C3D2E] hover:underline">
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-[#D4C5B0]">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-[#8B6F5E]">
                    {contact.phone ?? <span className="text-[#D4C5B0]">—</span>}
                  </TableCell>
                  <TableCell>
                    <LeadSourceBadge contact={contact} />
                  </TableCell>
                  <TableCell className="text-[#8B6F5E] text-sm">
                    {formatDate(contact.created_at)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
