import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // SW custom con injectManifest: control total sobre caching y activación
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
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
      injectManifest: {
        // index.html incluido en el precache con revision hash (Workbox lo gestiona).
        // Con skipWaiting() el SW nuevo activa inmediatamente en cada deploy,
        // por lo que el precache siempre refleja la versión actual — sin contenido stale.
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
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
