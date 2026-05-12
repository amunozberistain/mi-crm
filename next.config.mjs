/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer usa módulos internos de Node.js (canvas, streams).
  // serverExternalPackages es Next.js 15+; en Next.js 14 se usa la clave experimental.
  experimental: {
    serverComponentsExternalPackages: ['@react-pdf/renderer'],
  },
}

export default nextConfig
