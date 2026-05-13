import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Sidebar from '@/components/layout/sidebar'
import Header from '@/components/layout/header'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Comprobamos en el servidor si el usuario está autenticado
  // Si no lo está, el middleware ya lo redirige, pero esta es una doble comprobación
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')
  // Tras el redirect TypeScript sabe que user no es null, pero añadimos el assert por si acaso
  const email = (user as NonNullable<typeof user>).email ?? ''

  return (
    <div className="flex h-screen bg-[#F5F0E8] overflow-hidden">
      {/* Sidebar fijo a la izquierda */}
      <Sidebar />

      {/* Columna derecha: header + contenido */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <Header userEmail={email} />

        {/* Área de contenido con scroll */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
