import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Origen del backend (para permitir llamadas API e imágenes de /uploads).
const BACKEND = 'http://127.0.0.1:5000'
const BACKEND_ALT = 'http://localhost:5000'

// Construye la política CSP. En desarrollo, Vite (HMR) requiere 'unsafe-eval'
// y websockets; en preview (build) se endurece un poco.
const buildCsp = ({ dev }) => [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",                                   // anti-clickjacking
  "img-src 'self' data: blob: " + BACKEND + ' ' + BACKEND_ALT,
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",                          // estilos inline de Bootstrap
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ''}`,
  `connect-src 'self' ${BACKEND} ${BACKEND_ALT}${dev ? ' ws: wss:' : ''}`
].join('; ')

// Cabeceras de seguridad HTTP que exige el escaneo (CSP, anti-clickjacking,
// nosniff, HSTS) más Referrer-Policy.
const securityHeaders = ({ dev }) => ({
  'Content-Security-Policy': buildCsp({ dev }),
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
})

export default defineConfig({
  plugins: [react()],
  build: {
    // Desactiva la generación de Source Maps: evita exponer la estructura
    // interna de carpetas, servicios y módulos del proyecto en producción.
    sourcemap: false
  },
  server: {
    allowedHosts: true,
    port: 5173,
    open: true,
    headers: securityHeaders({ dev: true }),
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 4173,
    headers: securityHeaders({ dev: false })
  }
})
