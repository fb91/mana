import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdminStore } from '../../store/useAdminStore'

const BOOKS: [string, string][] = [
  ['Gn','Génesis'],['Ex','Éxodo'],['Lv','Levítico'],['Nm','Números'],['Dt','Deuteronomio'],
  ['Jos','Josué'],['Jue','Jueces'],['1Sam','1 Samuel'],['2Sam','2 Samuel'],
  ['1Re','1 Reyes'],['2Re','2 Reyes'],['Is','Isaías'],['Jr','Jeremías'],['Ez','Ezequiel'],
  ['Os','Oseas'],['Jl','Joel'],['Am','Amós'],['Abd','Abdías'],['Jon','Jonás'],
  ['Miq','Miqueas'],['Nah','Nahúm'],['Hab','Habacuc'],['Sof','Sofonías'],['Ag','Ageo'],
  ['Zac','Zacarías'],['Mal','Malaquías'],['Sal','Salmos'],['Job','Job'],['Prov','Proverbios'],
  ['Rt','Rut'],['Cant','Cantar de los Cantares'],['Ecl','Eclesiastés'],['Lam','Lamentaciones'],
  ['Est','Ester'],['Dn','Daniel'],['1Cro','1 Crónicas'],['2Cro','2 Crónicas'],
  ['Esd','Esdras'],['Neh','Nehemías'],['Jdt','Judit'],['Tb','Tobías'],
  ['1Mac','1 Macabeos'],['2Mac','2 Macabeos'],['Sab','Sabiduría'],['Sir','Eclesiástico'],
  ['Bar','Baruc'],['Mt','Mateo'],['Mc','Marcos'],['Lc','Lucas'],['Jn','Juan'],
  ['Hch','Hechos'],['Rom','Romanos'],['1Cor','1 Corintios'],['2Cor','2 Corintios'],
  ['Gal','Gálatas'],['Ef','Efesios'],['Flp','Filipenses'],['Col','Colosenses'],
  ['1Tes','1 Tesalonicenses'],['2Tes','2 Tesalonicenses'],['1Tim','1 Timoteo'],
  ['2Tim','2 Timoteo'],['Tit','Tito'],['Flm','Filemón'],['Heb','Hebreos'],
  ['Sant','Santiago'],['1Pe','1 Pedro'],['2Pe','2 Pedro'],['1Jn','1 Juan'],
  ['2Jn','2 Juan'],['3Jn','3 Juan'],['Jds','Judas'],['Ap','Apocalipsis'],
]

const BOOK_NAME: Record<string, string> = Object.fromEntries(BOOKS)

interface Correction {
  id: number
  bible_version: string
  book_id: string
  chapter: number
  verse: number
  texto_original: string | null
  texto_corregido: string
  motivo: string | null
  published: boolean
  created_at: string
}

interface FormState {
  book_id: string
  chapter: string
  verse: string
  texto_original: string
  texto_corregido: string
  motivo: string
  published: boolean
}

const EMPTY_FORM: FormState = {
  book_id: 'Gn',
  chapter: '',
  verse: '',
  texto_original: '',
  texto_corregido: '',
  motivo: '',
  published: false,
}

export default function AdminBibliaPage() {
  const navigate = useNavigate()
  const { session, isAdmin } = useAdminStore()

  const [corrections, setCorrections] = useState<Correction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => { fetchCorrections() }, [])

  async function fetchCorrections() {
    setLoading(true)
    const { data, error } = await supabase
      .from('bible_corrections')
      .select('*')
      .order('book_id')
      .order('chapter')
      .order('verse')
    if (error) setError(error.message)
    else setCorrections(data ?? [])
    setLoading(false)
  }

  function openNew() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
    setShowForm(true)
  }

  function openEdit(c: Correction) {
    setEditingId(c.id)
    setForm({
      book_id: c.book_id,
      chapter: String(c.chapter),
      verse: String(c.verse),
      texto_original: c.texto_original ?? '',
      texto_corregido: c.texto_corregido,
      motivo: c.motivo ?? '',
      published: c.published,
    })
    setFormError(null)
    setShowForm(true)
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setFormError(null)
    const chapter = parseInt(form.chapter)
    const verse = parseInt(form.verse)
    if (!form.book_id || !chapter || !verse) {
      setFormError('Libro, capítulo y versículo son obligatorios.')
      return
    }
    if (!form.texto_corregido.trim()) {
      setFormError('El texto corregido es obligatorio.')
      return
    }

    setSaving(true)
    const payload = {
      bible_version:    'lpd-1990-ar',
      book_id:          form.book_id,
      chapter,
      verse,
      texto_original:   form.texto_original.trim() || null,
      texto_corregido:  form.texto_corregido.trim(),
      motivo:           form.motivo.trim() || null,
      published:        isAdmin() ? form.published : false,
      created_by:       session?.user.id,
    }

    let err: string | null = null

    if (editingId === null) {
      const { error } = await supabase.from('bible_corrections').insert(payload)
      err = error?.message ?? null
    } else {
      const { error } = await supabase
        .from('bible_corrections')
        .update(payload)
        .eq('id', editingId)
      err = error?.message ?? null
    }

    setSaving(false)
    if (err) { setFormError(err); return }
    setShowForm(false)
    fetchCorrections()
  }

  async function handleDelete(id: number, ref: string) {
    if (!confirm(`¿Eliminar la corrección de ${ref}?`)) return
    const { error } = await supabase.from('bible_corrections').delete().eq('id', id)
    if (error) setError(error.message)
    else setCorrections(prev => prev.filter(c => c.id !== id))
  }

  async function togglePublish(c: Correction) {
    const { error } = await supabase
      .from('bible_corrections')
      .update({ published: !c.published })
      .eq('id', c.id)
    if (error) setError(error.message)
    else setCorrections(prev => prev.map(x => x.id === c.id ? { ...x, published: !x.published } : x))
  }

  return (
    <div className="min-h-screen bg-crema dark:bg-oscuro-bg pb-24">
      {/* Header */}
      <div className="border-b border-crema-200 dark:border-oscuro-border px-6 py-4 flex items-center gap-3 sticky top-0 bg-crema dark:bg-oscuro-bg z-10">
        <button onClick={() => navigate('/admin')} className="text-cafe-light dark:text-crema-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-cafe-dark dark:text-crema-100">Correcciones Biblia</h1>
          <p className="text-xs text-cafe-light dark:text-crema-400">El libro del pueblo de Dios (1990)</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 text-xs font-semibold text-dorado px-3 py-1.5 rounded-lg border border-dorado/40 active:scale-95 transition-all"
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M6.5 1v11M1 6.5h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          Nueva
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-4">
        {error && (
          <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* Formulario */}
        {showForm && (
          <div className="bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-bold text-cafe-dark dark:text-crema-100">
                {editingId === null ? 'Nueva corrección' : 'Editar corrección'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-cafe-light dark:text-crema-400 text-lg leading-none">×</button>
            </div>

            {formError && (
              <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{formError}</p>
            )}

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className={labelClass}>Libro *</label>
                <select value={form.book_id} onChange={e => setField('book_id', e.target.value)} className={inputClass}>
                  {BOOKS.map(([abbr, name]) => (
                    <option key={abbr} value={abbr}>{abbr} — {name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Capítulo *</label>
                <input type="number" min={1} value={form.chapter}
                  onChange={e => setField('chapter', e.target.value)}
                  placeholder="1" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Versículo *</label>
                <input type="number" min={1} value={form.verse}
                  onChange={e => setField('verse', e.target.value)}
                  placeholder="1" className={inputClass} />
              </div>
            </div>

            <div>
              <label className={labelClass}>Texto original (referencia)</label>
              <textarea value={form.texto_original}
                onChange={e => setField('texto_original', e.target.value)}
                rows={3} placeholder="Texto tal como aparece actualmente en el JSON..."
                className={inputClass + ' resize-none'} />
            </div>

            <div>
              <label className={labelClass}>Texto corregido *</label>
              <textarea value={form.texto_corregido}
                onChange={e => setField('texto_corregido', e.target.value)}
                rows={3} placeholder="Texto correcto que debe mostrarse en la app..."
                className={inputClass + ' resize-none'} />
            </div>

            <div>
              <label className={labelClass}>Motivo</label>
              <input value={form.motivo} onChange={e => setField('motivo', e.target.value)}
                placeholder="Ej: Error tipográfico, traducción más fiel..." className={inputClass} />
            </div>

            {isAdmin() && (
              <label className="flex items-center gap-3 cursor-pointer">
                <div className="relative">
                  <input type="checkbox" checked={form.published}
                    onChange={e => setField('published', e.target.checked)} className="sr-only" />
                  <div className={`w-11 h-6 rounded-full transition-colors ${form.published ? 'bg-dorado' : 'bg-crema-300 dark:bg-oscuro-border'}`}>
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.published ? 'left-[22px]' : 'left-0.5'}`} />
                  </div>
                </div>
                <span className="text-sm text-cafe-dark dark:text-crema-200">Publicada (visible en la app)</span>
              </label>
            )}

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSave}
                disabled={saving}
                className="bg-dorado text-crema-50 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="text-xs text-cafe-light dark:text-crema-400 px-4 py-2 rounded-xl border border-crema-200 dark:border-oscuro-border"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-dorado border-t-transparent rounded-full animate-spin" />
          </div>
        ) : corrections.length === 0 ? (
          <p className="text-sm text-cafe-light dark:text-crema-400 text-center py-12">
            No hay correcciones aún. Usá el botón Nueva para agregar una.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-xs text-cafe-light dark:text-crema-300">
              {corrections.length} corrección{corrections.length !== 1 ? 'es' : ''}
            </p>
            {corrections.map(c => {
              const ref = `${BOOK_NAME[c.book_id] ?? c.book_id} ${c.chapter},${c.verse}`
              return (
                <div key={c.id} className="bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-cafe-dark dark:text-crema-200">{ref}</span>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          c.published
                            ? 'bg-dorado/10 text-dorado'
                            : 'bg-crema-200 dark:bg-oscuro-border text-cafe-light dark:text-crema-400'
                        }`}>
                          {c.published ? 'Publicada' : 'Borrador'}
                        </span>
                      </div>
                      <p className="text-xs text-cafe-light dark:text-crema-400 mt-1 line-clamp-1 italic">
                        {c.texto_corregido}
                      </p>
                      {c.motivo && (
                        <p className="text-xs text-cafe-light dark:text-crema-400 mt-0.5">
                          Motivo: {c.motivo}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isAdmin() && (
                        <button
                          onClick={() => togglePublish(c)}
                          className="text-xs text-cafe-light dark:text-crema-400 hover:text-dorado transition-colors px-2 py-1 rounded-lg hover:bg-crema-100 dark:hover:bg-oscuro-border"
                        >
                          {c.published ? 'Despublicar' : 'Publicar'}
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(c)}
                        className="text-xs text-dorado px-2 py-1 rounded-lg border border-dorado/40 hover:bg-dorado/5 transition-colors"
                      >
                        Editar
                      </button>
                      {isAdmin() && (
                        <button
                          onClick={() => handleDelete(c.id, ref)}
                          className="text-xs text-red-400 px-2 py-1 rounded-lg border border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

const inputClass = `w-full rounded-xl border border-crema-300 dark:border-oscuro-border
  bg-white dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
  px-3 py-2.5 text-sm outline-none focus:border-dorado/60 transition-colors`

const labelClass = `text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide block mb-1.5`
