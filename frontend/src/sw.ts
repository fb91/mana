/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// Bump cuando quieras invalidar todos los runtime caches
const CV = 'v2'

// ── Activación inmediata ──────────────────────────────────────────────────────
// skipWaiting() garantiza que el SW nuevo activa sin esperar tabs cerradas.
// Esto hace que el precache (incluido index.html) siempre sea el del deploy actual.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !n.endsWith(`-${CV}`) && !n.startsWith('workbox-precache'))
            .map((n) => caches.delete(n))
        )
      )
      .then(() => self.clients.claim())
  )
})

// ── Push notifications ────────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload: { title?: string; body?: string; icon?: string; url?: string }
  try {
    payload = event.data.json()
  } catch {
    payload = { title: 'Maná', body: event.data.text(), icon: '/icons/icon-192.png', url: '/novenas' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const opts: any = {
    body: payload.body ?? 'Recordatorio de novena',
    icon: payload.icon ?? '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: 'mana-novena',
    renotify: true,
    data: { url: payload.url ?? '/novenas' },
    actions: [
      { action: 'open', title: 'Rezar ahora' },
      { action: 'dismiss', title: 'Más tarde' },
    ],
  }

  event.waitUntil(
    self.registration.showNotification(payload.title ?? 'Maná', opts)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  if (event.action === 'dismiss') return

  const url = (event.notification.data as { url?: string })?.url ?? '/novenas'

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((wins) => {
        for (const win of wins) {
          if ('focus' in win) {
            win.focus()
            win.navigate(url)
            return
          }
        }
        return self.clients.openWindow(url)
      })
  )
})

// ── Precache de todos los assets estáticos + index.html ──────────────────────
// Workbox asigna un revision hash a index.html; si cambia en el deploy,
// el nuevo SW (que activa por skipWaiting) lo reemplaza en el precache.

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Navegación SPA → precache de index.html ───────────────────────────────────
// createHandlerBoundToURL sirve el index.html precacheado para cualquier ruta
// (/biblia, /lecturas-del-dia, etc.), habilitando offline completo sin fetch.

registerRoute(
  new NavigationRoute(createHandlerBoundToURL('/index.html'))
)

// ── Datos bíblicos → CacheFirst (contenido estático, no cambia) ───────────────

registerRoute(
  /\/data\/.*\.json$/,
  new CacheFirst({
    cacheName: `bible-data-${CV}`,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 365 * 24 * 60 * 60, maxEntries: 10 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// ── Supabase → NetworkFirst ───────────────────────────────────────────────────

registerRoute(
  /^https:\/\/[^/]+\.supabase\.co\//,
  new NetworkFirst({
    cacheName: `supabase-${CV}`,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 7 * 24 * 60 * 60, maxEntries: 50 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)

// ── API externa → NetworkFirst ────────────────────────────────────────────────

registerRoute(
  /^https:\/\/api\./,
  new NetworkFirst({
    cacheName: `api-${CV}`,
    networkTimeoutSeconds: 5,
    plugins: [
      new ExpirationPlugin({ maxAgeSeconds: 300, maxEntries: 20 }),
      new CacheableResponsePlugin({ statuses: [0, 200] }),
    ],
  })
)
