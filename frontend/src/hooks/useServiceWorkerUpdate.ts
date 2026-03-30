import { useEffect, useState } from 'react'

export function useServiceWorkerUpdate() {
  const [hasUpdate, setHasUpdate] = useState(false)

  useEffect(() => {
    if (!navigator.serviceWorker) return

    // Si ya hay un controller al montar, cualquier cambio posterior es una actualización real.
    // Si no hay controller, el primer 'controllerchange' es la instalación inicial (no update).
    const hadController = Boolean(navigator.serviceWorker.controller)

    const handleControllerChange = () => {
      if (hadController) setHasUpdate(true)
    }

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
    }
  }, [])

  return {
    hasUpdate,
    reload: () => window.location.reload(),
  }
}
