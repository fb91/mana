import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png', 'icons/*.svg'],
      manifest: {
        name: 'Maná — Espiritualidad Católica',
        short_name: 'Maná',
        description: 'Tu compañero espiritual diario',
        theme_color: '#8B6914',
        background_color: '#FAF7F2',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          { src: '/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        // Incluye los handlers de push y notificationclick en el SW generado
        importScripts: ['/sw-push.js'],

        // Prefijo para los caches generados por Workbox (precache → mi-pwa-cache-v1-precache-v2)
        cacheId: 'mi-pwa-cache-v1',

        // Archivos pre-cacheados en el install del SW — excluimos bible_es.json
        // porque se persiste en IndexedDB libro por libro (más eficiente y sobrevive iOS)
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],

        // Ruta de fallback para navegación SPA cuando no hay red
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          {
            // Datos bíblicos: siempre desde caché (no cambian), red como respaldo
            urlPattern: /\/data\/.*\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'mi-pwa-cache-v1-datos',
              expiration: {
                maxAgeSeconds: 365 * 24 * 60 * 60, // 1 año
                maxEntries: 10
              },
              cacheableResponse: { statuses: [0, 200] }
            }
          },
          {
            // Llamadas a la API externa: red primero, caché como respaldo offline
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'mi-pwa-cache-v1-api',
              networkTimeoutSeconds: 5,
              expiration: { maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] }
            }
          }
        ]
      },
      devOptions: {
        enabled: false
      }
    })
  ],
  server: {
    port: 5173
  },

  build: {
    // Minificación de JS con esbuild (incluido en Vite, rápido y eficiente)
    minify: 'esbuild',
    // Minificación de CSS
    cssMinify: true,
    rollupOptions: {
      output: {
        // Code splitting manual: separa vendor de código de la app
        // Esto permite que el navegador cachee react/router por separado,
        // y solo re-descargue el código de la app cuando cambia.
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ai': ['@anthropic-ai/sdk'],
          'vendor-db': ['@supabase/supabase-js', 'idb'],
        }
      }
    }
  }
})
