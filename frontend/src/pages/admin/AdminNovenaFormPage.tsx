import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAdminStore } from '../../store/useAdminStore'

interface DiaForm {
  dia: number
  titulo: string
  oracion: string
  reflexion: string
}

interface NovenaForm {
  nombre: string
  santo: string
  descripcion: string
  intencion_sugerida: string
  autor: string
  estado: string
  categoria: string
  fecha_festividad: string
  published: boolean
  dias: DiaForm[]
}

const EMPTY_DIA = (n: number): DiaForm => ({ dia: n, titulo: '', oracion: '', reflexion: '' })
const EMPTY_FORM: NovenaForm = {
  nombre: '', santo: '', descripcion: '', intencion_sugerida: '',
  autor: '', estado: 'activa', categoria: '', fecha_festividad: '',
  published: false,
  dias: Array.from({ length: 9 }, (_, i) => EMPTY_DIA(i + 1)),
}

export default function AdminNovenaFormPage() {
  const { id } = useParams<{ id: string }>()
  const isNew = id === 'nueva'
  const navigate = useNavigate()
  const { session } = useAdminStore()

  const [form, setForm] = useState<NovenaForm>(EMPTY_FORM)
  const [activeDia, setActiveDia] = useState(1)
  const [loading, setLoading] = useState(!isNew)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isNew) loadNovena()
  }, [id])

  async function loadNovena() {
    setLoading(true)
    const { data: novena, error: nErr } = await supabase
      .from('novenas')
      .select('*')
      .eq('id', id)
      .single()

    if (nErr || !novena) { setError('No se encontró la novena'); setLoading(false); return }

    const { data: dias } = await supabase
      .from('novena_dias')
      .select('*')
      .eq('novena_id', id)
      .order('dia')

    const diasForm: DiaForm[] = Array.from({ length: 9 }, (_, i) => {
      const d = dias?.find(d => d.dia === i + 1)
      return d
        ? { dia: d.dia, titulo: d.titulo ?? '', oracion: d.oracion, reflexion: d.reflexion ?? '' }
        : EMPTY_DIA(i + 1)
    })

    setForm({
      nombre:             novena.nombre,
      santo:              novena.santo,
      descripcion:        novena.descripcion        ?? '',
      intencion_sugerida: novena.intencion_sugerida ?? '',
      autor:              novena.autor              ?? '',
      estado:             novena.estado,
      categoria:          novena.categoria          ?? '',
      fecha_festividad:   novena.fecha_festividad   ?? '',
      published:          novena.published,
      dias:               diasForm,
    })
    setLoading(false)
  }

  function setField<K extends keyof NovenaForm>(key: K, value: NovenaForm[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setDiaField(dia: number, key: keyof DiaForm, value: string) {
    setForm(f => ({
      ...f,
      dias: f.dias.map(d => d.dia === dia ? { ...d, [key]: value } : d),
    }))
  }

  async function handleSave() {
    setError(null)
    if (!form.nombre.trim() || !form.santo.trim()) {
      setError('Nombre y Santo son obligatorios.')
      return
    }
    const diasConOracion = form.dias.filter(d => d.oracion.trim())
    if (diasConOracion.length < 9) {
      setError('Todos los 9 días deben tener oración.')
      return
    }

    setSaving(true)
    const payload = {
      nombre:             form.nombre.trim(),
      santo:              form.santo.trim(),
      descripcion:        form.descripcion.trim()        || null,
      intencion_sugerida: form.intencion_sugerida.trim() || null,
      autor:              form.autor.trim()              || null,
      estado:             form.estado,
      categoria:          form.categoria.trim()          || null,
      fecha_festividad:   form.fecha_festividad          || null,
      published:          form.published,
      updated_at:         new Date().toISOString(),
    }

    let novenaId: number

    if (isNew) {
      const { data, error } = await supabase
        .from('novenas')
        .insert({ ...payload, created_by: session?.user.id })
        .select('id')
        .single()
      if (error || !data) { setError(error?.message ?? 'Error al crear'); setSaving(false); return }
      novenaId = data.id
    } else {
      const { error } = await supabase.from('novenas').update(payload).eq('id', id)
      if (error) { setError(error.message); setSaving(false); return }
      novenaId = Number(id)
      // Borrar días existentes para reinsertarlos
      await supabase.from('novena_dias').delete().eq('novena_id', novenaId)
    }

    // Insertar los 9 días
    const diasPayload = form.dias.map(d => ({
      novena_id: novenaId,
      dia:       d.dia,
      titulo:    d.titulo.trim()    || null,
      oracion:   d.oracion.trim(),
      reflexion: d.reflexion.trim() || null,
    }))

    const { error: dErr } = await supabase.from('novena_dias').insert(diasPayload)
    if (dErr) { setError(dErr.message); setSaving(false); return }

    navigate('/admin/novenas')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-crema dark:bg-oscuro-bg">
        <div className="w-6 h-6 border-2 border-dorado border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-crema dark:bg-oscuro-bg pb-24">
      {/* Header */}
      <div className="border-b border-crema-200 dark:border-oscuro-border px-6 py-4 flex items-center gap-3 sticky top-0 bg-crema dark:bg-oscuro-bg z-10">
        <button onClick={() => navigate('/admin/novenas')} className="text-cafe-light dark:text-crema-400">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M12 15l-5-5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <h1 className="text-lg font-bold text-cafe-dark dark:text-crema-100 flex-1">
          {isNew ? 'Nueva novena' : 'Editar novena'}
        </h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-dorado text-crema-50 text-xs font-semibold px-4 py-2 rounded-xl disabled:opacity-60"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </div>

      <div className="px-4 py-4 max-w-2xl mx-auto space-y-6">
        {error && (
          <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
        )}

        {/* ── Datos generales ── */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide">
            Datos generales
          </h2>

          <Field label="Nombre *">
            <input value={form.nombre} onChange={e => setField('nombre', e.target.value)}
              placeholder="Novena a San José" className={inputClass} />
          </Field>

          <Field label="Santo *">
            <input value={form.santo} onChange={e => setField('santo', e.target.value)}
              placeholder="San José" className={inputClass} />
          </Field>

          <Field label="Descripción">
            <textarea value={form.descripcion} onChange={e => setField('descripcion', e.target.value)}
              rows={3} placeholder="Breve descripción de la novena..." className={inputClass + ' resize-none'} />
          </Field>

          <Field label="Intención sugerida">
            <input value={form.intencion_sugerida} onChange={e => setField('intencion_sugerida', e.target.value)}
              placeholder="Ej: Por las familias..." className={inputClass} />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Autor">
              <input value={form.autor} onChange={e => setField('autor', e.target.value)}
                placeholder="Tradición de la Iglesia" className={inputClass} />
            </Field>
            <Field label="Categoría">
              <input value={form.categoria} onChange={e => setField('categoria', e.target.value)}
                placeholder="Mariana, Santos..." className={inputClass} />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha de festividad">
              <input type="date" value={form.fecha_festividad}
                onChange={e => setField('fecha_festividad', e.target.value)} className={inputClass} />
            </Field>
            <Field label="Estado">
              <select value={form.estado} onChange={e => setField('estado', e.target.value)} className={inputClass}>
                <option value="activa">Activa</option>
                <option value="borrador">Borrador</option>
              </select>
            </Field>
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input type="checkbox" checked={form.published}
                onChange={e => setField('published', e.target.checked)} className="sr-only" />
              <div className={`w-11 h-6 rounded-full transition-colors ${form.published ? 'bg-dorado' : 'bg-crema-300 dark:bg-oscuro-border'}`}>
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${form.published ? 'left-[22px]' : 'left-0.5'}`} />
              </div>
            </div>
            <span className="text-sm text-cafe-dark dark:text-crema-200">Publicada (visible para usuarios)</span>
          </label>
        </section>

        {/* ── Días ── */}
        <section>
          <h2 className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide mb-3">
            Días de oración
          </h2>

          {/* Selector de día */}
          <div className="flex gap-1.5 mb-4 overflow-x-auto pb-1">
            {form.dias.map(d => {
              const tieneOracion = d.oracion.trim().length > 0
              return (
                <button
                  key={d.dia}
                  onClick={() => setActiveDia(d.dia)}
                  className={`flex-shrink-0 w-9 h-9 rounded-full text-sm font-semibold transition-all ${
                    activeDia === d.dia
                      ? 'bg-dorado text-white'
                      : tieneOracion
                        ? 'bg-dorado/20 text-dorado'
                        : 'bg-crema-200 dark:bg-oscuro-border text-cafe-light dark:text-crema-400'
                  }`}
                >
                  {d.dia}
                </button>
              )
            })}
          </div>

          {/* Formulario del día activo */}
          {form.dias.filter(d => d.dia === activeDia).map(d => (
            <div key={d.dia} className="space-y-3">
              <Field label={`Título del día ${d.dia}`}>
                <input value={d.titulo}
                  onChange={e => setDiaField(d.dia, 'titulo', e.target.value)}
                  placeholder={`Día ${d.dia} — ...`} className={inputClass} />
              </Field>
              <Field label="Oración *">
                <textarea value={d.oracion}
                  onChange={e => setDiaField(d.dia, 'oracion', e.target.value)}
                  rows={8} placeholder="Texto de la oración..." className={inputClass + ' resize-none font-mono text-xs'} />
              </Field>
              <Field label="Reflexión">
                <textarea value={d.reflexion}
                  onChange={e => setDiaField(d.dia, 'reflexion', e.target.value)}
                  rows={4} placeholder="Reflexión del día..." className={inputClass + ' resize-none'} />
              </Field>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}

const inputClass = `w-full rounded-xl border border-crema-300 dark:border-oscuro-border
  bg-white dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
  px-3 py-2.5 text-sm outline-none focus:border-dorado/60 transition-colors`

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  )
}
