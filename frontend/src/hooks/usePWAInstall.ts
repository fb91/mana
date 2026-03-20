import { useState, useEffect } from 'react'

export type InstallState =
  | 'installed'   // ya está corriendo como PWA (standalone)
  | 'ios'         // iOS — necesita instrucciones manuales de Safari
  | 'prompt'      // Android/Desktop Chrome — se puede mostrar el prompt nativo
  | 'unavailable' // navegador no soporta instalación

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = Event & { prompt(): Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [state, setState] = useState<InstallState>(() => {
    if (window.matchMedia('(display-mode: standalone)').matches) return 'installed'
    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    return isIOS ? 'ios' : 'unavailable'
  })

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setState('prompt')
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function install() {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') setState('installed')
    setDeferredPrompt(null)
  }

  return { state, install }
}
