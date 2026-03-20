import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { api, Novena } from '../services/api'

export default function NovenasPage() {
  const [novenas, setNovenas] = useState<Novena[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api.getNovenas()
      .then(setNovenas)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="beads" size={18} />}
        title="Novenas"
        subtitle="Nueve días de oración continua"
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        {loading && (
          <div className="flex items-center justify-center py-12 animate-pulse-soft text-dorado">
            <Icon name="beads" size={40} />
          </div>
        )}

        {error && (
          <div className="card bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm text-center py-4">
            {error}
          </div>
        )}

        {!loading && !error && novenas.length === 0 && (
          <div className="text-center py-12 animate-fade-in">
            <span className="text-5xl">📿</span>
            <p className="text-cafe-light dark:text-crema-300 text-sm mt-4 max-w-xs mx-auto">
              Todavía no hay novenas aprobadas en el catálogo.
              Pronto habrá contenido disponible.
            </p>
          </div>
        )}

        {!loading && novenas.length > 0 && (
          <div className="space-y-3 animate-fade-in">
            <p className="text-xs text-cafe-light dark:text-crema-300 mb-2">
              {novenas.length} novena{novenas.length !== 1 ? 's' : ''} disponible{novenas.length !== 1 ? 's' : ''}
            </p>
            {novenas.map((novena) => (
              <Link
                key={novena.id}
                to={`/novenas/${novena.id}`}
                className="card block hover:border-dorado/50 hover:shadow-md transition-all
                           duration-200 active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-semibold text-cafe-dark dark:text-crema-200
                                   truncate">{novena.nombre}</h3>
                    <p className="text-sm text-dorado mt-0.5">✨ {novena.santo}</p>
                    {novena.descripcion && (
                      <p className="text-xs text-cafe-light dark:text-crema-300 mt-1.5 line-clamp-2">
                        {novena.descripcion}
                      </p>
                    )}
                  </div>
                  <span className="text-cafe-light dark:text-crema-300 text-xl flex-shrink-0">›</span>
                </div>
                {novena.intencionSugerida && (
                  <div className="mt-3 pt-3 border-t border-crema-200 dark:border-oscuro-border">
                    <p className="text-xs text-cafe-light dark:text-crema-300 italic">
                      "{novena.intencionSugerida}"
                    </p>
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}

        {/* Placeholder para contribuir */}
        <div className="mt-6 card bg-crema-100 dark:bg-oscuro-surface text-center py-6">
          <span className="text-3xl">✍️</span>
          <p className="font-serif text-cafe-dark dark:text-crema-200 mt-2 font-medium">
            ¿Querés contribuir?
          </p>
          <p className="text-xs text-cafe-light dark:text-crema-300 mt-1 mb-4 max-w-xs mx-auto">
            Si tenés una novena devocional que querés compartir, pronto habilitaremos
            el formulario de contribución.
          </p>
          <span className="text-xs text-dorado font-medium">Próximamente</span>
        </div>
      </div>
    </div>
  )
}
