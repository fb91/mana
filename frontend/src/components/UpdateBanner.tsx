import { useServiceWorkerUpdate } from '../hooks/useServiceWorkerUpdate'

export default function UpdateBanner() {
  const { hasUpdate, reload } = useServiceWorkerUpdate()

  if (!hasUpdate) return null

  return (
    <div
      role="alert"
      className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm"
      style={{ background: 'rgb(var(--color-card))', border: '1px solid rgb(var(--accent) / 0.3)' }}
    >
      <span style={{ color: 'rgb(var(--color-text))' }}>Nueva versión disponible</span>
      <button
        onClick={reload}
        className="font-semibold px-3 py-1 rounded-lg transition-opacity hover:opacity-80 active:opacity-60"
        style={{ background: 'rgb(var(--accent))', color: '#fff' }}
      >
        Actualizar
      </button>
    </div>
  )
}
