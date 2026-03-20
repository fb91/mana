import { Link } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { Novena } from '../services/api'
import novenasJson from '../data/novenas.json'
import { BugReportLink } from '../components/BugReportButton'

const novenas = novenasJson as Novena[]

export default function NovenasPage() {
  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="beads" size={18} />}
        title="Novenas"
        subtitle="Nueve días de oración continua"
      />

      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28">
        <div className="space-y-3 animate-fade-in">
          <p className="text-xs text-cafe-light dark:text-crema-300 mb-2">
            {novenas.length} novenas disponibles
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

        <BugReportLink />

      </div>
    </div>
  )
}
