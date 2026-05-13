'use client'

import { useState } from 'react'
import ContactsTab  from './contacts-tab'
import BillingTab   from './billing-tab'
import ExpensesTab  from './expenses-tab'
import SummaryTab   from './summary-tab'
import type { ContactWithDeals, DealWithContact } from '@/app/(dashboard)/workspace/page'
import type { Expense } from '@/types'

type Tab = 'contactos' | 'facturacion' | 'gastos' | 'resumen'

const TABS: { id: Tab; label: string }[] = [
  { id: 'contactos',  label: 'Contactos'   },
  { id: 'facturacion', label: 'Facturación' },
  { id: 'gastos',     label: 'Gastos'      },
  { id: 'resumen',    label: 'Resumen'     },
]

interface Props {
  initialContacts: ContactWithDeals[]
  initialWonDeals: DealWithContact[]
  initialExpenses: Expense[]
}

export default function WorkspaceClient({ initialContacts, initialWonDeals, initialExpenses }: Props) {
  const [tab,      setTab]      = useState<Tab>('contactos')
  const [contacts, setContacts] = useState(initialContacts)
  const [wonDeals, setWonDeals] = useState(initialWonDeals)
  const [expenses, setExpenses] = useState(initialExpenses)

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div>
        <h1 className="font-display text-3xl font-semibold text-[#2C1810] leading-tight">
          Workspace
        </h1>
        <p className="text-sm text-[#8B6F5E] mt-1">
          Gestión centralizada de contactos, facturación y gastos
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-[#EDE8DF] rounded-xl w-fit">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-white text-[#2C1810] shadow-sm'
                : 'text-[#8B6F5E] hover:text-[#5C3D2E]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'contactos'   && (
        <ContactsTab contacts={contacts} setContacts={setContacts} />
      )}
      {tab === 'facturacion' && (
        <BillingTab wonDeals={wonDeals} setWonDeals={setWonDeals} />
      )}
      {tab === 'gastos'      && (
        <ExpensesTab expenses={expenses} setExpenses={setExpenses} />
      )}
      {tab === 'resumen'     && (
        <SummaryTab wonDeals={wonDeals} expenses={expenses} />
      )}
    </div>
  )
}
