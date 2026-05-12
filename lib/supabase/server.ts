import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Cliente para usar en Server Components, Server Actions y Route Handlers
// Lee las cookies de sesión directamente desde la petición HTTP
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // En Server Components no se pueden escribir cookies,
            // el middleware se encarga de refrescar la sesión
          }
        },
      },
    }
  )
}
