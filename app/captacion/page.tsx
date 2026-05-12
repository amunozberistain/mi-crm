import CaptacionForm from './captacion-form'

// Esta página es pública (excluida del middleware de auth).
// La URL del anuncio en Meta lleva UTMs: /captacion?utm_campaign=X&utm_content=Y&fbclid=Z
// El formulario captura esos parámetros y crea el contacto en el CRM automáticamente.
export default function CaptacionPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>
}) {
  const utmParams = {
    utm_source:   searchParams.utm_source   ?? null,
    utm_medium:   searchParams.utm_medium   ?? null,
    utm_campaign: searchParams.utm_campaign ?? null,
    utm_content:  searchParams.utm_content  ?? null,
    utm_term:     searchParams.utm_term     ?? null,
    fbclid:       searchParams.fbclid       ?? null,
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-black/5 p-8">
          <div className="mb-8">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Solicita más información</h1>
            <p className="text-gray-500 mt-2 text-sm leading-relaxed">
              Rellena el formulario y nos pondremos en contacto contigo lo antes posible.
            </p>
          </div>

          <CaptacionForm utmParams={utmParams} />
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Tu información es confidencial y nunca se comparte con terceros.
        </p>
      </div>
    </main>
  )
}
