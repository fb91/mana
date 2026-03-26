import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { slugify } from '../lib/slugify'
import { Novena } from '../services/api'
import { BugReportLink } from '../components/BugReportButton'
import { useAppStore } from '../store/useAppStore'
import { useAdminStore } from '../store/useAdminStore'
import { supabase, withRetry } from '../lib/supabase'

const CATEGORIAS: { value: string; label: string }[] = [
  { value: '', label: 'Todas' },
  { value: 'jesus', label: 'Jesús' },
  { value: 'maria', label: 'María' },
  { value: 'santos', label: 'Santos' },
  { value: 'angeles', label: 'Ángeles' },
  { value: 'especial', label: 'Especial' },
]

/** Próxima novena por fecha de festividad. Solo considera fechas "MM-DD". */
function getProximaNovena(novenas: Novena[]): Novena | null {
  const today = new Date()
  const mm = today.getMonth() + 1
  const dd = today.getDate()
  const todayNum = mm * 100 + dd

  const withDate = novenas
    .filter(n => /^\d{2}-\d{2}$/.test(n.fechaFestividad ?? ''))
    .map(n => {
      const [m, d] = (n.fechaFestividad as string).split('-').map(Number)
      const fNum = m * 100 + d
      const diff = fNum >= todayNum ? fNum - todayNum : 1200 + fNum - todayNum // wrap around year
      return { novena: n, diff }
    })
    .sort((a, b) => a.diff - b.diff)

  return withDate.length > 0 ? withDate[0].novena : null
}

function formatFecha(fechaFestividad: string | null | undefined): string {
  if (!fechaFestividad) return ''
  if (/^\d{2}-\d{2}$/.test(fechaFestividad)) {
    const [m, d] = fechaFestividad.split('-').map(Number)
    return new Date(2000, m - 1, d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long' })
  }
  return fechaFestividad
}

export default function NovenasPage() {
  const novenasProgreso = useAppStore(s => s.novenasProgreso)
  const { isContributor } = useAdminStore()
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [categoria, setCategoria] = useState('')
  const [baseNovenas, setBaseNovenas] = useState<Novena[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    withRetry(() =>
      supabase
        .from('novenas')
        .select('id, nombre, santo, descripcion, intencion_sugerida, categoria, fecha_festividad')
        .eq('published', true)
        .order('nombre')
        .then(({ data, error: sbError }) => {
          if (sbError) throw sbError
          return data
        })
    )
      .then(data => {
        setBaseNovenas((data ?? []).map(row => ({
          id: row.id,
          nombre: row.nombre,
          santo: row.santo,
          descripcion: row.descripcion ?? undefined,
          intencionSugerida: row.intencion_sugerida ?? undefined,
          estado: 'publicado',
          categoria: row.categoria ?? undefined,
          fechaFestividad: row.fecha_festividad ?? undefined,
        })))
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        setError(true)
      })

    // Prefetch de todos los días en bulk: misma query que usa NovenaDetallePage,
    // así el SW la cachea aquí y el detalle la sirve desde caché offline.
    supabase
      .from('novena_dias')
      .select('id, novena_id, dia, titulo, oracion, reflexion')
      .order('novena_id')
      .order('dia')
      .then(() => {})
  }, [])

  const proximaNovena = useMemo(() => getProximaNovena(baseNovenas), [baseNovenas])

  const novenas = useMemo(() => {
    let list = baseNovenas
    if (categoria) list = list.filter(n => n.categoria === categoria)
    if (query.trim()) {
      const q = query.toLowerCase()
      list = list.filter(n =>
        n.nombre.toLowerCase().includes(q) ||
        n.santo.toLowerCase().includes(q) ||
        (n.descripcion ?? '').toLowerCase().includes(q)
      )
    }
    return list
  }, [query, categoria, baseNovenas])

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="beads" size={18} />}
        title="Novenas"
        subtitle="Nueve días de oración continua"
        actions={isContributor() ? (
          <button
            onClick={() => navigate('/admin/novenas/nueva')}
            className="flex items-center gap-1.5 text-xs font-semibold text-dorado px-3 py-1.5 rounded-lg border border-dorado/40 active:scale-95 transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            Nueva
          </button>
        ) : undefined}
      />

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Banner novena próxima */}
        {proximaNovena && !query && !categoria && (
          <Link
            to={`/novenas/${slugify(proximaNovena.nombre)}`}
            className="block mx-4 mt-4 p-3 rounded-xl bg-dorado/10 border border-dorado/30
                       hover:bg-dorado/15 transition-colors"
          >
            <p className="text-xs font-semibold text-dorado uppercase tracking-wide mb-0.5">
              📅 Próxima festividad — {formatFecha(proximaNovena.fechaFestividad)}
            </p>
            <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 text-sm">
              {proximaNovena.nombre}
            </p>
            {proximaNovena.descripcion && (
              <p className="text-xs text-cafe-light dark:text-crema-400 mt-0.5 line-clamp-1">
                {proximaNovena.descripcion}
              </p>
            )}
          </Link>
        )}

        <div className="px-4 pt-4 space-y-3 animate-fade-in">
          {/* Búsqueda */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cafe-light dark:text-crema-400 text-sm">
              🔍
            </span>
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar novena o santo..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm
                         bg-crema-100 dark:bg-oscuro-card border border-crema-200 dark:border-oscuro-border
                         text-cafe-dark dark:text-crema-200 placeholder:text-cafe-light dark:placeholder:text-crema-400
                         focus:outline-none focus:border-dorado/60"
            />
          </div>

          {/* Filtro categorías */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {CATEGORIAS.map(cat => (
              <button
                key={cat.value}
                onClick={() => setCategoria(cat.value)}
                className={`flex-shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full transition-colors ${
                  categoria === cat.value
                    ? 'bg-dorado text-cafe-dark'
                    : 'bg-crema-100 dark:bg-oscuro-card text-cafe-light dark:text-crema-300 border border-crema-200 dark:border-oscuro-border hover:border-dorado/40'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-dorado border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center gap-3 py-12 text-center">
              <p className="text-sm text-cafe-light dark:text-crema-400">
                No se pudieron cargar las novenas.
              </p>
              <button
                onClick={() => window.location.reload()}
                className="text-xs font-semibold text-dorado border border-dorado/40 px-4 py-2 rounded-lg active:scale-95 transition-all"
              >
                Reintentar
              </button>
            </div>
          ) : (
          <p className="text-xs text-cafe-light dark:text-crema-300">
            {novenas.length} novena{novenas.length !== 1 ? 's' : ''} disponible{novenas.length !== 1 ? 's' : ''}
          </p>
          )}

          {!loading && novenas.length === 0 && (
            <p className="text-sm text-cafe-light dark:text-crema-400 text-center py-8">
              No se encontraron novenas.
            </p>
          )}

          {novenas.map((novena) => {
            const progreso = novenasProgreso.find(p => p.novenaId === novena.id)
            const completados = progreso?.diasCompletados.length ?? 0
            const terminada = completados >= 9
            const enCurso = progreso && !terminada

            return (
              <Link
                key={novena.id}
                to={`/novenas/${slugify(novena.nombre)}`}
                className="card block hover:border-dorado/50 hover:shadow-md transition-all
                           duration-200 active:scale-[0.98]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 truncate">
                      {novena.nombre}
                    </h3>
                    <p className="text-sm text-dorado mt-0.5">✨ {novena.santo}</p>
                    {novena.descripcion && !progreso && (
                      <p className="text-xs text-cafe-light dark:text-crema-300 mt-1.5 line-clamp-2">
                        {novena.descripcion}
                      </p>
                    )}
                    {progreso?.intencion && (
                      <p className="text-xs text-cafe-light dark:text-crema-400 mt-1.5 italic truncate">
                        &ldquo;{progreso.intencion}&rdquo;
                      </p>
                    )}
                    {novena.fechaFestividad && !progreso && /^\d{2}-\d{2}$/.test(novena.fechaFestividad) && (
                      <p className="text-xs text-cafe-light dark:text-crema-400 mt-1">
                        🗓 {formatFecha(novena.fechaFestividad)}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    {terminada ? (
                      <span className="text-xs font-semibold text-dorado bg-dorado/10 px-2 py-0.5 rounded-full">
                        Completada
                      </span>
                    ) : enCurso ? (
                      <span className="text-xs font-semibold text-cafe-light dark:text-crema-300">
                        Día {completados + 1}/9
                      </span>
                    ) : null}
                    <span className="text-cafe-light dark:text-crema-300 text-xl">›</span>
                  </div>
                </div>

                {/* Mini barra de progreso */}
                {progreso && (
                  <div className="mt-3 flex gap-1">
                    {Array.from({ length: 9 }, (_, i) => (
                      <div
                        key={i}
                        className={`flex-1 h-1 rounded-full ${
                          progreso.diasCompletados.includes(i + 1)
                            ? 'bg-dorado'
                            : 'bg-crema-200 dark:bg-oscuro-border'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {!progreso && novena.intencionSugerida && (
                  <div className="mt-3 pt-3 border-t border-crema-200 dark:border-oscuro-border">
                    <p className="text-xs text-cafe-light dark:text-crema-300 italic">
                      &ldquo;{novena.intencionSugerida}&rdquo;
                    </p>
                  </div>
                )}
              </Link>
            )
          })}
        </div>

        <div className="px-4">
          <BugReportLink />
        </div>
      </div>
    </div>
  )
}
