import { useEffect, useState } from 'react'

export function useServiceWorkerUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    if (!navigator.serviceWorker) return

    // En una SPA las rutas son pushState — el browser nunca hace un request real
    // y por lo tanto nunca checkea si el SW cambió. Debemos pedirlo nosotros.
    const checkForUpdate = () => {
      navigator.serviceWorker.getRegistration().then((reg) => reg?.update()).catch(() => {})
    }

    // Check inmediato al montar
    checkForUpdate()

    // Check al volver al foco (visibilitychange para Android, focus para iOS standalone)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate()
    }
    const handleFocus = () => checkForUpdate()

    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleFocus)

    // Detectar cuando el nuevo SW toma control
    // hadController=true → ya había SW activo → el cambio es una actualización real
    const hadController = Boolean(navigator.serviceWorker.controller)
    const handleControllerChange = () => {
      if (hadController) setHasUpdate(true)
    }
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleFocus)
    }
  }, [])

  return {
    hasUpdate,
    reload: () => window.location.reload(),
  }
}
