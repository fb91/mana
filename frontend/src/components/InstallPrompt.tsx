import { useState, useEffect } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)

  useEffect(() => {
    // No mostrar en PC/laptop — solo en dispositivos móviles
    const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent)
    if (!isMobile) return

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Mostrar después de 10 segundos de uso
      setTimeout(() => setShowBanner(true), 10000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowBanner(false)
      setDeferredPrompt(null)
    }
  }

  if (!showBanner || !deferredPrompt) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 animate-slide-up">
      <div className="card shadow-xl border-dorado/30 flex items-center gap-3 py-4">
        <span className="text-3xl flex-shrink-0">📲</span>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-cafe-dark dark:text-crema-200 text-sm">
            Instalá Maná en tu celular
          </p>
          <p className="text-xs text-cafe-light dark:text-crema-300">
            Accedé rápido desde la pantalla de inicio
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button
            onClick={() => setShowBanner(false)}
            className="text-xs text-cafe-light dark:text-crema-300 px-2 py-1"
          >
            Ahora no
          </button>
          <button onClick={handleInstall} className="btn-primary text-xs py-2 px-3">
            Instalar
          </button>
        </div>
      </div>
    </div>
  )
}
