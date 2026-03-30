import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate'

export default function UpdateBanner() {
  const { hasUpdate, reload } = useServiceWorkerUpdate()

  if (!hasUpdate) return null

  return (
    <div
      role="alert"
      className="w-full flex items-center justify-between px-4 py-2.5 gap-3"
      style={{ background: 'rgb(var(--accent))', color: '#fff' }}
    >
      <span className="text-sm font-medium">Nueva versión disponible</span>
      <button
        onClick={reload}
        className="shrink-0 text-sm font-semibold px-3 py-1 rounded-lg"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      >
        Actualizar
      </button>
    </div>
  )
}
