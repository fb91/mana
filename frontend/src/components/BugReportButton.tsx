import { useState, createContext, useContext } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../services/api'

const ROUTE_LABELS: Record<string, string> = {
  '/inicio': 'Inicio',
  '/biblia': 'Biblia',
  '/lecturas-del-dia': 'Lecturas del día',
  '/recomendacion': 'Recomendación espiritual',
  '/santo': '¿Con qué santo conectás?',
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

// Context para comunicar entre el link y el modal
interface BugReportContextType {
  openModal: () => void
}

const BugReportContext = createContext<BugReportContextType | null>(null)

// Hook para usar el context
function useBugReport() {
  const context = useContext(BugReportContext)
  if (!context) {
    throw new Error('useBugReport debe usarse dentro de BugReportProvider')
  }
  return context
}

// Componente provider que contiene el modal (se usa en App.tsx)
export function BugReportProvider({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const pageLabel = getPageLabel(pathname)
  const currentUrl = typeof window !== 'undefined' ? window.location.href : ''

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
      await api.reportBug(pageLabel, description.trim(), currentUrl)
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
    <BugReportContext.Provider value={{ openModal: handleOpen }}>
      {children}
      
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
              <div className="flex-1 mr-4">
                <h2 className="font-serif text-lg font-semibold text-cafe-dark dark:text-crema-200">
                  Reportar un error
                </h2>
                <p className="text-xs text-cafe-light dark:text-crema-400 mt-0.5">
                  Sección actual:&nbsp;
                  <span className="font-medium text-dorado">{pageLabel}</span>
                </p>
                <p className="text-xs text-cafe-light dark:text-crema-400 mt-1 break-all">
                  Link:&nbsp;
                  <span className="font-mono text-[10px]">{currentUrl}</span>
                </p>
              </div>
              <button
                onClick={handleClose}
                className="text-cafe-light dark:text-crema-400 hover:text-cafe-dark text-sm py-1 px-2 -mr-1 flex-shrink-0"
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
    </BugReportContext.Provider>
  )
}

// Link para agregar al final de cada página
export function BugReportLink() {
  const { openModal } = useBugReport()

  return (
    <div className="flex justify-end py-4 pr-4">
      <button
        onClick={openModal}
        className="text-xs text-cafe-light dark:text-crema-400 hover:text-dorado
                   underline underline-offset-2 decoration-1
                   transition-colors duration-200"
      >
        Reportar un error
      </button>
    </div>
  )
}

// Export default mantiene compatibilidad pero ahora es solo el provider
export default BugReportProvider
