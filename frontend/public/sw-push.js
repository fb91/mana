// Service Worker adicional para manejar notificaciones push
// Este archivo es procesado por Workbox junto con el SW generado por vite-plugin-pwa

self.addEventListener('push', (event) => {
  if (!event.data) return

  let payload
  try {
    payload = event.data.json()
  } catch {
    payload = {
      title: 'Maná',
      body: event.data.text(),
      icon: '/icons/icon-192.png',
      url: '/novenas',
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Maná', {
      body: payload.body || 'Recordatorio de novena',
      icon: payload.icon || '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'mana-novena',
      renotify: true,
      data: { url: payload.url || '/novenas' },
      actions: [
        { action: 'open', title: 'Rezar ahora' },
        { action: 'dismiss', title: 'Más tarde' },
      ],
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') return

  const url = event.notification.data?.url || '/novenas'

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si ya hay una ventana abierta, enfocarla
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      // Si no, abrir nueva ventana
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})
