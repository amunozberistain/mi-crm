'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const navItems = [
  {
    href: '/workspace',
    label: 'Workspace',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 7a2 2 0 012-2h4a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7zm10-4h4a2 2 0 012 2v4a2 2 0 01-2 2h-4a2 2 0 01-2-2V5a2 2 0 012-2zm0 10h4a2 2 0 012 2v2a2 2 0 01-2 2h-4a2 2 0 01-2-2v-2a2 2 0 012-2z" />
      </svg>
    ),
  },
  {
    href: '/pipeline',
    label: 'Pipeline',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
      </svg>
    ),
  },
  {
    href: '/activities',
    label: 'Actividades',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    href: '/funnel',
    label: 'Funnel',
    icon: (
      <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
          d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
      </svg>
    ),
  },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-56 flex-shrink-0 bg-[#EDE8DF] flex flex-col border-r border-[#D4C5B0]">

      {/* Logo */}
      <div className="px-6 pt-7 pb-6 border-b border-[#D4C5B0]">
        <p className="font-display text-[10px] tracking-[0.22em] uppercase text-[#8B6F5E] font-medium">
          The Mind Flow
        </p>
        <p className="font-display text-[1.35rem] font-semibold leading-tight text-[#2C1810] mt-0.5">
          AI Studio
        </p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-5 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[#5C3D2E] text-white shadow-sm'
                  : 'text-[#5C3D2E] hover:bg-[#D4C5B0]/50 hover:text-[#2C1810]'
              )}
            >
              {item.icon}
              {item.label}
            </Link>
          )
        })}
      </nav>

      {/* Footer decorativo */}
      <div className="px-6 py-5 border-t border-[#D4C5B0]">
        <p className="text-[10px] text-[#8B6F5E]/60 tracking-wide uppercase font-medium">
          CRM · v1.0
        </p>
      </div>
    </aside>
  )
}
