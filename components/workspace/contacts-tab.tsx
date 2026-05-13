'use client'

import { useState, useMemo, useRef } from 'react'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { createContact } from '@/app/(dashboard)/contacts/actions'
import ContactEditModal from '@/components/contacts/contact-edit-modal'
import { updateContactDelivery } from '@/app/(dashboard)/workspace/actions'
import type { Contact } from '@/types'
import type { ContactWithDeals } from '@/app/(dashboard)/workspace/page'

interface Props {
  contacts:    ContactWithDeals[]
  setContacts: React.Dispatch<React.SetStateAction<ContactWithDeals[]>>
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

function LeadSourceBadge({ contact }: { contact: ContactWithDeals }) {
  if (contact.lead_source === 'meta_lead_ads' || contact.lead_source === 'meta_landing') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
        Meta Ads
      </span>
    )
  }
  if (contact.source) {
    return <Badge variant="secondary" className="font-normal">{contact.source}</Badge>
  }
  return <span className="text-[#D4C5B0]">—</span>
}

export default function ContactsTab({ contacts, setContacts }: Props) {
  const [search,      setSearch]      = useState('')
  const [createOpen,  setCreateOpen]  = useState(false)
  const [editContact, setEditContact] = useState<ContactWithDeals | null>(null)
  const [isPending,   setIsPending]   = useState(false)
  const [error,       setError]       = useState<string | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return contacts
    return contacts.filter(c =>
      c.name.toLowerCase().includes(q) ||
      (c.company ?? '').toLowerCase().includes(q) ||
      (c.email ?? '').toLowerCase().includes(q)
    )
  }, [contacts, search])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setIsPending(true)
    try {
      await createContact(new FormData(e.currentTarget))
      formRef.current?.reset()
      setCreateOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsPending(false)
    }
  }

  async function handleToggleDelivery(contact: ContactWithDeals) {
    const next = !contact.videos_delivered
    setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, videos_delivered: next } : c))
    try {
      await updateContactDelivery(contact.id, next)
    } catch {
      setContacts(prev => prev.map(c => c.id === contact.id ? { ...c, videos_delivered: contact.videos_delivered } : c))
    }
  }

  function handleContactUpdated(updated: Contact) {
    setContacts(prev => prev.map(c => c.id === updated.id ? { ...c, ...updated } : c))
  }

  function handleContactDeleted(contactId: string) {
    setContacts(prev => prev.filter(c => c.id !== contactId))
    setEditContact(null)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B6F5E]"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <Input
            className="pl-9"
            placeholder="Buscar por nombre, empresa o email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <button
          onClick={() => { setError(null); setCreateOpen(true) }}
          className="flex items-center gap-2 bg-[#5C3D2E] hover:bg-[#4A3024] text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors shadow-sm shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Añadir contacto
        </button>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-[#D4C5B0] bg-white overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#EDE8DF] border-b border-[#D4C5B0]">
              <TableHead className="text-[#8B6F5E] text-xs uppercase tracking-wide font-semibold">Nombre</TableHead>
              <TableHead className="text-[#8B6F5E] text-xs uppercase tracking-wide font-semibold">Empresa</TableHead>
              <TableHead className="text-[#8B6F5E] text-xs uppercase tracking-wide font-semibold">Email</TableHead>
              <TableHead className="text-[#8B6F5E] text-xs uppercase tracking-wide font-semibold">Origen</TableHead>
              <TableHead className="text-[#8B6F5E] text-xs uppercase tracking-wide font-semibold text-center">Vídeos solicitados</TableHead>
              <TableHead className="text-[#8B6F5E] text-xs uppercase tracking-wide font-semibold text-center">Vídeos entregados</TableHead>
              <TableHead className="text-[#8B6F5E] text-xs uppercase tracking-wide font-semibold">Añadido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-16 text-[#8B6F5E]/60">
                  {search ? `Sin resultados para "${search}"` : 'Aún no tienes contactos.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(contact => {
                const videosRequested = (contact.deals ?? []).reduce(
                  (sum, d) => sum + (d.cantidad_videos ?? 0), 0
                )
                return (
                  <TableRow
                    key={contact.id}
                    className="hover:bg-[#F5F0E8] transition-colors border-b border-[#D4C5B0]/40"
                  >
                    <TableCell
                      className="font-medium text-[#2C1810] cursor-pointer"
                      onClick={() => setEditContact(contact)}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#5C3D2E]/10 flex items-center justify-center shrink-0">
                          <span className="text-[#5C3D2E] text-xs font-semibold">
                            {contact.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        {contact.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-[#8B6F5E] cursor-pointer" onClick={() => setEditContact(contact)}>
                      {contact.company ?? <span className="text-[#D4C5B0]">—</span>}
                    </TableCell>
                    <TableCell className="text-[#8B6F5E]" onClick={e => e.stopPropagation()}>
                      {contact.email ? (
                        <a href={`mailto:${contact.email}`} className="hover:text-[#5C3D2E] hover:underline">
                          {contact.email}
                        </a>
                      ) : <span className="text-[#D4C5B0]">—</span>}
                    </TableCell>
                    <TableCell onClick={() => setEditContact(contact)} className="cursor-pointer">
                      <LeadSourceBadge contact={contact} />
                    </TableCell>
                    <TableCell className="text-center">
                      {videosRequested > 0 ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#EDE8DF] text-[#5C3D2E] text-sm font-semibold">
                          {videosRequested}
                        </span>
                      ) : (
                        <span className="text-[#D4C5B0]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => handleToggleDelivery(contact)}
                        title={contact.videos_delivered ? 'Marcar como no entregado' : 'Marcar como entregado'}
                        className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors mx-auto ${
                          contact.videos_delivered
                            ? 'bg-[#5C3D2E] border-[#5C3D2E]'
                            : 'border-[#D4C5B0] hover:border-[#5C3D2E]'
                        }`}
                      >
                        {contact.videos_delivered && (
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </button>
                    </TableCell>
                    <TableCell className="text-[#8B6F5E] text-sm cursor-pointer" onClick={() => setEditContact(contact)}>
                      {formatDate(contact.created_at)}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl font-semibold text-[#2C1810]">
              Nuevo contacto
            </DialogTitle>
          </DialogHeader>
          <form ref={formRef} onSubmit={handleCreate} className="space-y-4 mt-2">
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
            {error && <p className="text-sm text-red-600 bg-red-50 rounded-md px-3 py-2">{error}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isPending} className="bg-[#5C3D2E] hover:bg-[#4A3024] text-white">
                {isPending ? 'Guardando…' : 'Guardar contacto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit modal */}
      {editContact && (
        <ContactEditModal
          contact={editContact}
          open={!!editContact}
          onOpenChange={v => { if (!v) setEditContact(null) }}
          onUpdated={handleContactUpdated}
          onContactDeleted={handleContactDeleted}
        />
      )}
    </div>
  )
}
