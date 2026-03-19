import { useState, useCallback } from 'react'
import { api } from '../services/api'
import { useAppStore } from '../store/useAppStore'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || ''

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const array = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) {
    array[i] = rawData.charCodeAt(i)
  }
  return array.buffer
}

export function usePushNotifications() {
  const { pushSubscription, setPushSubscription } = useAppStore()
  const [requesting, setRequesting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isSupported = 'serviceWorker' in navigator && 'PushManager' in window

  const subscribe = useCallback(async (): Promise<PushSubscriptionJSON | null> => {
    if (!isSupported) {
      setError('Tu navegador no soporta notificaciones push')
      return null
    }
    if (pushSubscription) return pushSubscription

    setRequesting(true)
    setError(null)

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setError('Permiso de notificaciones denegado')
        return null
      }

      const registration = await navigator.serviceWorker.ready
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const subJson = sub.toJSON()
      await api.subscribePush(subJson)
      setPushSubscription(subJson)
      return subJson
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al activar notificaciones'
      setError(msg)
      return null
    } finally {
      setRequesting(false)
    }
  }, [isSupported, pushSubscription, setPushSubscription])

  return { subscribe, pushSubscription, requesting, error, isSupported }
}
