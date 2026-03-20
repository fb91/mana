import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../services/api'

const ROUTE_LABELS: Record<string, string> = {
  '/inicio': 'Inicio',
  '/biblia': 'Biblia',
  '/lecturas-del-dia': 'Lecturas del día',
  '/recomendacion': 'Recomendación espiritual',
  '/santo': 'Un Santo Para Vos',
  '/novenas': 'Novenas',
  '/examen': 'Examen de Conciencia',
  '/ajustes': 'Ajustes',
}

function getPageLabel(pathname: string): string {
  // Exact match first
  if (ROUTE_LABELS[pathname]) return ROUTE_LABELS[pathname]
  // Prefix match (e.g. /biblia/Gn/3, /novenas/123)
  const prefix = Object.keys(ROUTE_LABELS).find(k => k !== '/' && pathname.startsWith(k))
  return prefix ? ROUTE_LABELS[prefix] : pathname
}

export default function BugReportButton() {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const pageLabel = getPageLabel(pathname)

  function handleOpen() {
    setOpen(true)
    setSent(false)
    setError('')
    setDescription('')
  }

  function handleClose() {
    setOpen(false)
  }

  async function handleSend() {
    if (!description.trim() || sending) return
    setSending(true)
    setError('')
    try {
      await api.reportBug(pageLabel, description.trim())
      setSent(true)
      setDescription('')
      setTimeout(() => setOpen(false), 2000)
    } catch {
      setError('No se pudo enviar. Intentá de nuevo.')
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      {/* Floating trigger button */}
      <button
        onClick={handleOpen}
        title="Reportar un error"
        aria-label="Reportar un error"
        className="fixed top-3 right-3 z-[60] w-8 h-8 rounded-full
                   bg-white/70 dark:bg-oscuro-surface/70 backdrop-blur-sm
                   border border-crema-200 dark:border-oscuro-border
                   shadow-sm flex items-center justify-center
                   text-cafe-light dark:text-crema-400 hover:text-dorado
                   hover:border-dorado/50 transition-all duration-200
                   active:scale-90"
      >
        {/* Exclamation / flag icon */}
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
          <path fillRule="evenodd"
            d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z"
            clipRule="evenodd" />
        </svg>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          className="fixed inset-0 z-[80] flex items-start justify-center sm:items-center"
          onClick={handleClose}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

          <div
            className="relative w-full sm:max-w-sm bg-crema dark:bg-oscuro-bg
                       rounded-b-3xl sm:rounded-3xl px-5 pb-6
                       pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:pt-5 sm:pb-6
                       shadow-2xl"
            onClick={e => e.stopPropagation()}
          >

            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-serif text-lg font-semibold text-cafe-dark dark:text-crema-200">
                  Reportar un error
                </h2>
                <p className="text-xs text-cafe-light dark:text-crema-400 mt-0.5">
                  Página actual:&nbsp;
                  <span className="font-medium text-dorado">{pageLabel}</span>
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-cafe-light dark:text-crema-400 hover:text-cafe-dark text-sm py-1 px-2 -mr-1"
              >
                ✕
              </button>
            </div>

            {sent ? (
              <div className="text-center py-6 animate-fade-in">
                <div className="text-3xl mb-2">✅</div>
                <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium">
                  ¡Gracias! Tu reporte fue enviado.
                </p>
              </div>
            ) : (
              <>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describí brevemente el problema que encontraste..."
                  rows={4}
                  className="input-field text-sm w-full resize-none mb-3"
                  autoFocus
                  maxLength={500}
                />

                {error && (
                  <p className="text-xs text-red-500 mb-3">{error}</p>
                )}

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-cafe-light dark:text-crema-400">
                    {description.length}/500
                  </span>
                  <button
                    onClick={handleSend}
                    disabled={!description.trim() || sending}
                    className="btn-primary text-sm py-2 px-5 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {sending ? 'Enviando...' : 'Enviar reporte'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
