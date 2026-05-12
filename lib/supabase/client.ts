import { createBrowserClient } from '@supabase/ssr'

// Cliente para usar en componentes del navegador (Client Components)
// Se llama con 'use client' al inicio del archivo
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
