/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, CacheFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision: string | null }>
}

// Bump cuando quieras invalidar todos los runtime caches
const CV = 'v2'

// ── Activación inmediata + pre-cache de index.html ───────────────────────────

self.addEventListener('install', (event) => {
  self.skipWaiting()
  // Guarda index.html en el install para que navegación funcione offline
  // desde el primer momento, sin necesidad de haber visitado online antes.
  // Si la red no está disponible durante el install, no falla el SW.
  event.waitUntil(
    caches.open(`navigate-${CV}`)
      .then((cache) => cache.add('/'))
      .catch(() => { /* red no disponible al instalar — se llenará en la primera visita online */ })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) =>
        Promise.all(
          names
            .filter((n) => !n.endsWith(`-${CV}`))
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

// ── Precache assets estáticos (sin index.html) ────────────────────────────────

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// ── Navegación → NetworkFirst con fallback offline a index.html ───────────────
// Red primero: garantiza index.html fresco en cada deploy.
// Offline: devuelve el index.html pre-cacheado en el install (SPA shell).

registerRoute(
  ({ request }) => request.mode === 'navigate',
  async ({ request }) => {
    try {
      const response = await fetch(request)
      // Actualiza la caché con el index.html más reciente
      const cache = await caches.open(`navigate-${CV}`)
      cache.put('/', response.clone())
      return response
    } catch {
      // Sin red: sirve el SPA shell cacheado en el install
      const fallback = await caches.match('/', { cacheName: `navigate-${CV}` })
      return fallback ?? new Response('Sin conexión', { status: 503 })
    }
  }
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
