import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { slugify } from '../../lib/slugify'

interface NovenaSummary {
  id: number
  nombre: string
  santo: string
  categoria: string | null
  published: boolean
  updated_at: string
}

export default function AdminNovenasPage() {
  const navigate = useNavigate()
  const [novenas, setNovenas] = useState<NovenaSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [publishing, setPublishing] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => { fetchNovenas() }, [])

  async function fetchNovenas() {
    setLoading(true)
    const { data, error } = await supabase
      .from('novenas')
      .select('id, nombre, santo, categoria, published, updated_at')
      .order('nombre')
    if (error) setError(error.message)
    else setNovenas(data ?? [])
    setLoading(false)
  }

  async function togglePublish(novena: NovenaSummary) {
    setPublishing(novena.id)
    const { error } = await supabase
      .from('novenas')
      .update({ published: !novena.published, updated_at: new Date().toISOString() })
      .eq('id', novena.id)
    if (error) setError(error.message)
    else setNovenas(prev => prev.map(n => n.id === novena.id ? { ...n, published: !n.published } : n))
    setPublishing(null)
  }

  async function deleteNovena(id: number, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? Esta acción no se puede deshacer.`)) return
    setDeleting(id)
    const { error } = await supabase.from('novenas').delete().eq('id', id)
    if (error) setError(error.message)
    else setNovenas(prev => prev.filter(n => n.id !== id))
    setDeleting(null)
  }

  return (
    <div className="min-h-screen bg-crema dark:bg-oscuro-bg">
      {/* Header */}
      <div className="border-b border-crema-200 dark:border-oscuro-border px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/admin')} className="text-cafe-light dark:text-crema-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-cafe-dark dark:text-crema-100 flex-1">Novenas</h1>
        <button
          onClick={() => navigate('/admin/novenas/nueva')}
          className="bg-dorado text-crema-50 text-xs font-semibold px-4 py-2 rounded-xl"
        >
          + Nueva
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto">
        {error && (
          <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2 mb-4">{error}</p>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-dorado border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-2">
            {/* Resumen */}
            <p className="text-xs text-cafe-light dark:text-crema-400 mb-3">
              {novenas.filter(n => n.published).length} publicadas · {novenas.filter(n => !n.published).length} borradores · {novenas.length} total
            </p>

            {novenas.map(novena => (
              <div
                key={novena.id}
                className="bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border rounded-2xl px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200 truncate">
                        {novena.nombre}
                      </p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                        novena.published
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                      }`}>
                        {novena.published ? 'Publicada' : 'Borrador'}
                      </span>
                    </div>
                    <p className="text-xs text-cafe-light dark:text-crema-400 mt-0.5">{novena.santo}</p>
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* Ver en app */}
                    {novena.published && (
                      <button
                        onClick={() => navigate(`/novenas/${slugify(novena.nombre)}`)}
                        title="Ver en la app"
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-cafe-light dark:text-crema-400 hover:bg-crema-100 dark:hover:bg-oscuro-border transition-colors"
                      >
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M2 7.5C2 7.5 4.5 3 7.5 3s5.5 4.5 5.5 4.5S10.5 12 7.5 12 2 7.5 2 7.5z" stroke="currentColor" strokeWidth="1.3"/>
                          <circle cx="7.5" cy="7.5" r="1.5" stroke="currentColor" strokeWidth="1.3"/>
                        </svg>
                      </button>
                    )}

                    {/* Editar */}
                    <button
                      onClick={() => navigate(`/admin/novenas/${novena.id}`)}
                      title="Editar"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-cafe-light dark:text-crema-400 hover:bg-crema-100 dark:hover:bg-oscuro-border transition-colors"
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                        <path d="M10.5 2.5l2 2-8 8H2.5v-2l8-8z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
                      </svg>
                    </button>

                    {/* Publicar / Despublicar */}
                    <button
                      onClick={() => togglePublish(novena)}
                      disabled={publishing === novena.id}
                      title={novena.published ? 'Pasar a borrador' : 'Publicar'}
                      className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${
                        novena.published
                          ? 'text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20'
                          : 'text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20'
                      }`}
                    >
                      {publishing === novena.id ? (
                        <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M7.5 1v9M4 5.5L7.5 2l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M2 10v2a1 1 0 001 1h9a1 1 0 001-1v-2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                        </svg>
                      )}
                    </button>

                    {/* Eliminar */}
                    <button
                      onClick={() => deleteNovena(novena.id, novena.nombre)}
                      disabled={deleting === novena.id}
                      title="Eliminar"
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {deleting === novena.id ? (
                        <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                          <path d="M3 4h9M6 4V2.5h3V4M5 4v7.5h5V4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
