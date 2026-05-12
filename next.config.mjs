/** @type {import('next').NextConfig} */
const nextConfig = {
  // @react-pdf/renderer usa módulos internos de Node.js (canvas, streams).
  // Sin esto, webpack intenta empaquetarlo y falla.
  serverExternalPackages: ['@react-pdf/renderer'],
}

export default nextConfig
