/**
 * Configuration Vite : React + proxy /api vers Laravel (artisan serve :8000).
 */
import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const rootDir = path.dirname(fileURLToPath(import.meta.url))
const LARAVEL_HOST = '127.0.0.1'
const LARAVEL_PORT = 8001

/** Démarre `php artisan serve` pendant `npm run dev`. */
function laravelApiPlugin() {
  let child = null

  return {
    name: 'laravel-api-server',
    configureServer(server) {
      if (child) return

      child = spawn('php', ['artisan', 'serve', `--host=${LARAVEL_HOST}`, `--port=${LARAVEL_PORT}`], {
        cwd: path.join(rootDir, 'backend'),
        stdio: ['ignore', 'pipe', 'pipe'],
      })

      const log = (buf) => {
        const text = buf.toString().trim()
        if (text) console.log(`[laravel] ${text}`)
      }
      child.stdout.on('data', log)
      child.stderr.on('data', log)
      child.on('exit', (code) => {
        if (code && code !== 0) {
          console.error(`[laravel] arrêt inattendu (code ${code})`)
        }
        child = null
      })

      const stop = () => {
        if (!child) return
        child.kill('SIGTERM')
        child = null
      }
      server.httpServer?.once('close', stop)
      process.once('exit', stop)
    },
  }
}

export default defineConfig({
  plugins: [react(), laravelApiPlugin()],
  server: {
    headers: {
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:",
        "img-src 'self' data:",
        "connect-src 'self' ws://localhost:5173 ws://127.0.0.1:5173",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "object-src 'none'",
      ].join('; '),
    },
    proxy: {
      '/api': {
        target: `http://${LARAVEL_HOST}:${LARAVEL_PORT}`,
        changeOrigin: true,
      },
    },
  },
})
