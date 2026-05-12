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
import type { Contact } from '@/types'

interface Props {
  contacts: Contact[]
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-ES', {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}

export default function ContactsClient({ contacts }: Props) {
  const [search, setSearch]     = useState('')
  const [open, setOpen]         = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError]       = useState<string | null>(null)
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
      setOpen(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Cabecera */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {contacts.length} contacto{contacts.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Botón abre el diálogo directamente mediante estado */}
        <Button
          className="bg-indigo-600 hover:bg-indigo-700"
          onClick={() => { setError(null); setOpen(true) }}
        >
          + Añadir contacto
        </Button>
      </div>

      {/* Modal de nuevo contacto */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nuevo contacto</DialogTitle>
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
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isPending ? 'Guardando…' : 'Guardar contacto'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Buscador */}
      <div className="relative max-w-sm">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
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
      <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="font-semibold text-gray-700">Nombre</TableHead>
              <TableHead className="font-semibold text-gray-700">Empresa</TableHead>
              <TableHead className="font-semibold text-gray-700">Email</TableHead>
              <TableHead className="font-semibold text-gray-700">Teléfono</TableHead>
              <TableHead className="font-semibold text-gray-700">Fuente</TableHead>
              <TableHead className="font-semibold text-gray-700">Añadido</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-16 text-gray-400">
                  {search
                    ? `Sin resultados para "${search}"`
                    : 'Aún no tienes contactos. ¡Añade el primero!'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-gray-50 transition-colors">
                  <TableCell className="font-medium text-gray-900">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-indigo-700 text-xs font-semibold">
                          {contact.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      {contact.name}
                    </div>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {contact.company ?? <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {contact.email ? (
                      <a href={`mailto:${contact.email}`} className="hover:text-indigo-600 hover:underline">
                        {contact.email}
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {contact.phone ?? <span className="text-gray-300">—</span>}
                  </TableCell>
                  <TableCell>
                    {contact.source ? (
                      <Badge variant="secondary" className="font-normal">{contact.source}</Badge>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-500 text-sm">
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
