import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabase'

// ── Catálogos ───────────────────────────────────────────────────────────────

type TipoIntencion = 'Petición' | 'Acción de gracias'
// 'Intención personal' = catch-all para Petición (sin subcategoría)
// 'Agradecimiento general' = catch-all para Acción de gracias (motivo = "Acción de gracias")
type Categoria =
  | 'Salud' | 'Familia' | 'Trabajo' | 'Fe' | 'Emocional' | 'Económico'
  | 'Intención personal' | 'Agradecimiento general'

const CATEGORIAS_BASE: Categoria[] = ['Salud', 'Familia', 'Trabajo', 'Fe', 'Emocional', 'Económico']

function getCategorias(tipo: TipoIntencion | null): Categoria[] {
  if (!tipo) return []
  return tipo === 'Petición'
    ? [...CATEGORIAS_BASE, 'Intención personal']
    : [...CATEGORIAS_BASE, 'Agradecimiento general']
}

// Subcategorías para Petición: incluyen situaciones difíciles o en curso
const SUBCATEGORIAS_PETICION: Partial<Record<Categoria, string[]>> = {
  'Salud':     ['Enfermedad', 'Cirugía', 'Recuperación', 'Adicciones', 'Embarazo'],
  'Familia':   ['Conflicto familiar', 'Matrimonio / pareja', 'Crianza de hijos', 'Duelo / pérdida'],
  'Trabajo':   ['Búsqueda de empleo', 'Problema laboral', 'Discernimiento vocacional'],
  'Fe':        ['Conversión', 'Alejamiento de la fe', 'Sacramentos', 'Protección espiritual'],
  'Emocional': ['Depresión / ansiedad', 'Duelo / pérdida', 'Paz interior'],
  'Económico': ['Situación económica', 'Deudas'],
  // catch-all: sin subcategorías
}

// Subcategorías para Acción de gracias: solo logros, dones o sucesos positivos
const SUBCATEGORIAS_GRACIAS: Partial<Record<Categoria, string[]>> = {
  'Salud':     ['Recuperación', 'Nacimiento', 'Sanación'],
  'Familia':   ['Matrimonio / pareja', 'Reconciliación', 'Crianza de hijos'],
  'Trabajo':   ['Nuevo empleo', 'Proyecto logrado', 'Vocación encontrada'],
  'Fe':        ['Conversión', 'Sacramentos', 'Fortaleza recibida'],
  'Emocional': ['Paz interior', 'Superación personal'],
  'Económico': ['Estabilidad económica', 'Provisión recibida'],
  // 'Agradecimiento general': sin subcategorías
}

function getSubcategorias(tipo: TipoIntencion | null, categoria: Categoria | null): string[] {
  if (!tipo || !categoria) return []
  const map = tipo === 'Acción de gracias' ? SUBCATEGORIAS_GRACIAS : SUBCATEGORIAS_PETICION
  return map[categoria] ?? []
}

const CONTEXTOS = ['urgente', 'prolongado'] as const

// ── Construcción del motivo almacenado ─────────────────────────────────────

function buildMotivo(
  tipo: TipoIntencion,
  categoria: Categoria,
  subcategoria: string | null,
  contexto: string | null,
): string {
  // Catch-all de Acción de gracias → solo "Acción de gracias"
  if (categoria === 'Agradecimiento general') return 'Acción de gracias'

  if (tipo === 'Acción de gracias') {
    const parts = ['Acción de gracias', categoria, ...(subcategoria ? [subcategoria] : [])]
    return parts.join(' · ')
  }
  const parts = [categoria, ...(subcategoria ? [subcategoria] : [])]
  let result = parts.join(' · ')
  if (contexto) result += ` (${contexto})`
  return result
}

// ── Validación del nombre ──────────────────────────────────────────────────

const NAME_BLACKLIST = [
  'dni', 'doc', 'tel', 'gmail', 'yahoo', 'hotmail', 'outlook',
  'email', 'mail', 'numero', 'celular', 'phone', 'apellido',
  'facebook', 'instagram', 'twitter', 'whatsapp', 'signal',
]

function validateName(raw: string): { valid: boolean; error?: string; normalized?: string } {
  const trimmed = raw.trim()
  if (trimmed.length < 2) return { valid: false, error: 'El nombre debe tener al menos 2 letras.' }
  if (trimmed.length > 25) return { valid: false, error: 'El nombre es demasiado largo (máx. 25 letras).' }
  const words = trimmed.split(' ')
  if (words.length > 2) return { valid: false, error: 'Máximo dos palabras (nombre y apodo).' }
  for (const w of words) {
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/.test(w))
      return { valid: false, error: 'Solo letras, sin números ni símbolos.' }
  }
  const lower = trimmed.toLowerCase()
  if (NAME_BLACKLIST.some(w => lower.includes(w)))
    return { valid: false, error: 'No ingreses datos personales.' }
  const normalized = words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ')
  return { valid: true, normalized }
}

// ── Captcha ─────────────────────────────────────────────────────────────────

interface Captcha { a: number; b: number; answer: number }
function generateCaptcha(): Captcha {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a + b }
}

// ── Tipos ───────────────────────────────────────────────────────────────────

interface PrayerRequest { motivo: string; nombre: string }
const MAX_DOTS = 15
const SIN_NOMBRE_VALUE = 'Anónimo'

// ── Confetti ─────────────────────────────────────────────────────────────────

interface Particle {
  id: number
  dx: string; cyUp: string; cyDown: string
  rot: string; rotMid: string
  color: string; size: number
  duration: number; delay: number
  wide: boolean // rect vs circle-ish
}

const CONFETTI_COLORS = ['#c5922a', '#d4a843', '#e8c070', '#f5ecd0', '#ffffff', '#b8860b']

function generateConfetti(): Particle[] {
  return Array.from({ length: 56 }, (_, i) => ({
    id: i,
    dx:     `${(Math.random() - 0.5) * 340}px`,
    cyUp:   `${-80 - Math.random() * 160}px`,
    cyDown: `${60 + Math.random() * 220}px`,
    rot:    `${(Math.random() - 0.5) * 900}deg`,
    rotMid: `${(Math.random() - 0.5) * 360}deg`,
    color:  CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
    size:   4 + Math.random() * 5,
    duration: 0.9 + Math.random() * 0.6,
    delay:    Math.random() * 0.15,
    wide:     Math.random() > 0.4,
  }))
}

// ── Componente ───────────────────────────────────────────────────────────────

export default function PedidoOracionPage() {
  const navigate = useNavigate()

  // ── Stories ──────────────────────────────────────────────────────────────
  const [prayerRequests, setPrayerRequests] = useState<PrayerRequest[]>([])
  const [storyIndex, setStoryIndex] = useState(0)
  const [showHeart, setShowHeart] = useState(false)
  const [confetti, setConfetti] = useState<Particle[] | null>(null)
  const [prayersLoading, setPrayersLoading] = useState(true)

  useEffect(() => {
    async function fetchPrayers() {
      const { data } = await supabase
        .from('prayer_requests')
        .select('motivo, nombre')
        .order('created_at', { ascending: false })
      if (data) {
        const seen = new Set<string>()
        const unique: PrayerRequest[] = []
        for (const row of data) {
          const key = `${row.motivo}|${row.nombre}`
          if (!seen.has(key)) { seen.add(key); unique.push({ motivo: row.motivo, nombre: row.nombre }) }
        }
        setPrayerRequests(unique)
      }
      setPrayersLoading(false)
    }
    fetchPrayers()
  }, [])

  // Auto-avance cada 5s; se resetea al cambiar de historia
  useEffect(() => {
    if (prayerRequests.length < 2) return
    const t = setTimeout(() => setStoryIndex(p => (p + 1) % prayerRequests.length), 5000)
    return () => clearTimeout(t)
  }, [storyIndex, prayerRequests.length])

  function handleRezar() {
    if ((showHeart || confetti) || prayerRequests.length === 0) return
    const current = prayerRequests[storyIndex]
    const isGracias = current?.motivo.startsWith('Acción de gracias')
    if (isGracias) {
      setConfetti(generateConfetti())
      setTimeout(() => {
        setConfetti(null)
        setStoryIndex(p => (p + 1) % prayerRequests.length)
      }, 1300)
    } else {
      setShowHeart(true)
      setTimeout(() => {
        setShowHeart(false)
        setStoryIndex(p => (p + 1) % prayerRequests.length)
      }, 900)
    }
  }

  // ── Form state ────────────────────────────────────────────────────────────
  const [tipo, setTipo]               = useState<TipoIntencion | null>(null)
  const [categoria, setCategoria]     = useState<Categoria | null>(null)
  const [subcategoria, setSubcat]     = useState<string | null>(null)
  const [contexto, setContexto]       = useState<string | null>(null)
  const [sinNombre, setSinNombre]     = useState(false)
  const [nombre, setNombre]           = useState('')
  const [nombreError, setNombreError] = useState<string | null>(null)
  const [captcha, setCaptcha]         = useState<Captcha>(generateCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const [accepted, setAccepted]       = useState(false)
  const [loading, setLoading]         = useState(false)
  const [submitted, setSubmitted]     = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleTipoChange(t: TipoIntencion) {
    setTipo(t); setCategoria(null); setSubcat(null); setContexto(null)
  }
  function handleCategoriaChange(c: Categoria) {
    setCategoria(c); setSubcat(null)
  }

  const handleNombreChange = useCallback((val: string) => {
    const filtered = val.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ ]/g, '').replace(/  +/g, ' ')
    setNombre(filtered); setNombreError(null)
  }, [])

  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha()); setCaptchaInput(''); setCaptchaError(null)
  }

  const motivoBuilt = tipo && categoria
    ? buildMotivo(tipo, categoria, subcategoria, contexto)
    : null

  const nombrePreview = sinNombre
    ? SIN_NOMBRE_VALUE
    : (validateName(nombre).normalized ?? (nombre.trim() || null))

  const previewText = motivoBuilt
    ? `${motivoBuilt}${nombrePreview ? ` · ${nombrePreview}` : ''}`
    : null

  async function handleSubmit() {
    setSubmitError(null)
    const captchaNum = parseInt(captchaInput, 10)
    if (isNaN(captchaNum) || captchaNum !== captcha.answer) {
      setCaptchaError('Respuesta incorrecta. Intentá de nuevo.')
      handleRefreshCaptcha(); return
    }
    let finalNombre = ''
    if (sinNombre) {
      finalNombre = SIN_NOMBRE_VALUE
    } else {
      const nr = validateName(nombre)
      if (!nr.valid) { setNombreError(nr.error ?? 'Nombre inválido.'); return }
      finalNombre = nr.normalized!
    }
    if (!tipo || !categoria || !accepted) return
    setLoading(true)
    try {
      const { error } = await supabase
        .from('prayer_requests')
        .insert({ motivo: motivoBuilt, nombre: finalNombre })
      if (error) throw error
      setSubmitted(true)
    } catch {
      setSubmitError('No se pudo enviar el pedido. Intentá de nuevo.')
      handleRefreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = tipo !== null
    && categoria !== null
    && (sinNombre || nombre.trim().length >= 2)
    && captchaInput.trim().length > 0
    && accepted && !loading

  // ── Success ───────────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="Pedidos de oración" icon={<Icon name="hands" size={18} />} />
        <div className="flex-1 overflow-y-auto px-4 py-8 lg:px-8 flex flex-col items-center justify-center gap-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-dorado/15 flex items-center justify-center text-dorado">
            <Icon name="check" size={32} />
          </div>
          <div className="text-center">
            <h2 className="font-serif font-bold text-cafe-dark dark:text-crema-200 text-xl mb-2">
              ¡Pedido enviado!
            </h2>
            <p className="text-sm text-cafe-light dark:text-crema-300 leading-relaxed max-w-xs">
              Tu intención <span className="font-semibold text-dorado">{previewText}</span> será compartida con la comunidad durante los próximos 7 días.
            </p>
          </div>
          <button onClick={() => navigate('/inicio')} className="btn-primary">
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ── Story parsing ─────────────────────────────────────────────────────────
  const current  = prayerRequests.length > 0 ? prayerRequests[storyIndex] : null
  const dotCount = Math.min(prayerRequests.length, MAX_DOTS)

  const mParts     = current ? current.motivo.split(' · ') : []
  const motivoMain = mParts[0] ?? ''
  const motivoDet  = mParts.slice(1).join(' · ') || null
  const isGracias  = motivoMain === 'Acción de gracias'
  const storyNombre = current?.nombre && current.nombre !== SIN_NOMBRE_VALUE
    ? `por ${current.nombre}`
    : null

  // Step numbering: Contexto step only for Petición
  const nombreStep = tipo === 'Petición' ? 5 : 4

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Pedidos de oración" icon={<Icon name="hands" size={18} />} />

      <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-8 animate-fade-in">

        <style>{`
          @keyframes heart-burst {
            0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.2); }
            20%  { opacity: 1; transform: translate(-50%, -50%) scale(1.6); }
            60%  { opacity: 1; transform: translate(-50%, -50%) scale(1.3); }
            100% { opacity: 0; transform: translate(-50%, -50%) scale(2.2); }
          }
          .heart-burst {
            animation: heart-burst 0.95s ease-out forwards;
            position: absolute; left: 50%; top: 45%;
            pointer-events: none; z-index: 20;
          }
          @keyframes story-progress { from { width: 0%; } to { width: 100%; } }
          .story-progress-fill { animation: story-progress 5s linear forwards; }
          @keyframes confetti-fall {
            0%   { opacity: 1;   transform: translate(0, 0) rotate(0deg); }
            35%  { opacity: 1;   transform: translate(var(--cx), var(--cy-up)) rotate(var(--cr-mid)); }
            100% { opacity: 0;   transform: translate(var(--cx), var(--cy-down)) rotate(var(--cr)); }
          }
          .confetti-piece {
            position: fixed; pointer-events: none;
            animation: confetti-fall var(--dur) var(--delay) ease-out forwards;
          }
        `}</style>

        {/* ── Stories ── */}
        {prayersLoading && (
          <div className="mb-8 rounded-3xl bg-[#1c1206] h-72 flex items-center justify-center">
            <div className="w-6 h-6 rounded-full border-2 border-white/20 border-t-white/70 animate-spin" />
          </div>
        )}

        {!prayersLoading && prayerRequests.length > 0 && (
          <div className="mb-8">
            <div className="relative rounded-3xl overflow-hidden bg-[#1c1206] flex flex-col"
                 style={{ minHeight: '320px' }}>

              {/* Radial glow */}
              <div className="absolute inset-0 pointer-events-none"
                   style={{ background: 'radial-gradient(ellipse 70% 50% at 50% 30%, rgba(197,146,42,0.12) 0%, transparent 70%)' }} />

              {/* Heart burst — solo para Petición */}
              {showHeart && (
                <div className="heart-burst">
                  <svg width="110" height="110" viewBox="0 0 24 24" fill="#c5922a">
                    <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
              )}

              {/* Progress bars */}
              {dotCount > 0 && (
                <div className="relative z-10 flex gap-1.5 px-5 pt-5">
                  {Array.from({ length: dotCount }).map((_, i) => {
                    const ni = storyIndex % dotCount
                    return (
                      <div key={i} className="h-[3px] flex-1 rounded-full overflow-hidden bg-white/15">
                        {i < ni  && <div className="h-full w-full bg-white/55 rounded-full" />}
                        {i === ni && <div key={`p-${storyIndex}`} className="story-progress-fill h-full bg-white rounded-full" />}
                      </div>
                    )
                  })}
                </div>
              )}

              <p className="relative z-10 text-[10px] font-semibold uppercase tracking-widest text-white/30 px-5 pt-2.5">
                {storyIndex + 1} / {prayerRequests.length}
              </p>

              {/* Content */}
              <div className="relative z-10 flex-1 flex flex-col items-center justify-center text-center px-7 py-8">
                <p className="font-serif font-bold text-white leading-tight"
                   style={{ fontSize: 'clamp(2.2rem, 9vw, 3.5rem)' }}>
                  {motivoMain}
                </p>
                {motivoDet && (
                  <p className="text-dorado/65 text-sm font-medium tracking-wide mt-2">
                    {motivoDet}
                  </p>
                )}
                {storyNombre && (
                  <p className="text-white/35 text-sm font-medium tracking-wide mt-1.5">
                    {storyNombre}
                  </p>
                )}
              </div>

              {/* Button */}
              <div className="relative z-10 px-5 pb-5">
                <button
                  onClick={handleRezar}
                  disabled={!!(showHeart || confetti)}
                  className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl
                             bg-dorado hover:bg-dorado/90 active:scale-[0.98]
                             text-white font-semibold text-sm tracking-wide
                             transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {isGracias ? (
                    <span className="text-base leading-none">🙌</span>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  )}
                  {isGracias
                    ? (storyNombre ? `Dar gracias ${storyNombre}` : 'Dar gracias')
                    : (storyNombre ? `Rezar ${storyNombre}` : 'Rezar por esta intención')}
                </button>
              </div>
            </div>
          </div>
        )}

        {!prayersLoading && prayerRequests.length === 0 && (
          <div className="mb-8 rounded-3xl bg-[#1c1206] px-5 py-10 flex flex-col items-center gap-3 text-center">
            <Icon name="hands" size={28} className="text-white/30" />
            <p className="text-sm text-white/50">Todavía no hay pedidos de oración. ¡Sé el primero!</p>
          </div>
        )}

        {/* ── Divider ── */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-crema-200 dark:bg-oscuro-border" />
          <p className="text-[11px] font-bold uppercase tracking-widest text-cafe-light/50 dark:text-crema-400/50 whitespace-nowrap">
            Pedí oraciones
          </p>
          <div className="flex-1 h-px bg-crema-200 dark:bg-oscuro-border" />
        </div>

        <p className="text-sm text-cafe-light dark:text-crema-300 leading-relaxed mb-6">
          Pedí oraciones por vos o por alguien especial. Tu intención será mostrada de manera anónima a la comunidad durante 7 días.
        </p>

        {/* ── Paso 1: Tipo de intención ── */}
        <section className="mb-6">
          <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-3">
            1. Tipo de intención
          </h2>
          <div className="flex gap-2">
            {(['Petición', 'Acción de gracias'] as TipoIntencion[]).map(t => (
              <button
                key={t}
                onClick={() => handleTipoChange(t)}
                className={[
                  'flex-1 py-2.5 rounded-full text-sm font-medium border transition-all duration-150',
                  tipo === t
                    ? 'bg-dorado text-white border-dorado shadow-sm'
                    : 'bg-white dark:bg-oscuro-surface border-crema-300 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50',
                ].join(' ')}
              >
                {t === 'Petición' ? '♥  Petición' : '✦  Acción de gracias'}
              </button>
            ))}
          </div>
        </section>

        {/* ── Paso 2: Categoría ── */}
        {tipo && (
          <section className="mb-6 animate-fade-in">
            <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-3">
              2. Categoría
            </h2>
            <div className="flex flex-wrap gap-2">
              {getCategorias(tipo).map(c => {
                const isCatchAll = c === 'Intención personal' || c === 'Agradecimiento general'
                return (
                  <button
                    key={c}
                    onClick={() => handleCategoriaChange(c)}
                    className={[
                      'px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150',
                      isCatchAll ? 'italic' : '',
                      categoria === c
                        ? 'bg-dorado text-white border-dorado shadow-sm'
                        : 'bg-white dark:bg-oscuro-surface border-crema-300 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50',
                    ].join(' ')}
                  >
                    {c}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {/* ── Paso 3: Subcategoría (opcional) ── */}
        {categoria && getSubcategorias(tipo, categoria).length > 0 && (
          <section className="mb-6 animate-fade-in">
            <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-1">
              3. Detalle{' '}
              <span className="text-cafe-light/50 dark:text-crema-400/50 font-normal text-xs">(opcional)</span>
            </h2>
            <div className="flex flex-wrap gap-2 mt-3">
              {getSubcategorias(tipo, categoria).map(s => (
                <button
                  key={s}
                  onClick={() => setSubcat(subcategoria === s ? null : s)}
                  className={[
                    'px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150',
                    subcategoria === s
                      ? 'bg-dorado text-white border-dorado shadow-sm'
                      : 'bg-white dark:bg-oscuro-surface border-crema-300 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50',
                  ].join(' ')}
                >
                  {s}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Paso 4: Contexto — solo para Petición ── */}
        {tipo === 'Petición' && categoria && (
          <section className="mb-6 animate-fade-in">
            <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-1">
              4. Contexto{' '}
              <span className="text-cafe-light/50 dark:text-crema-400/50 font-normal text-xs">(opcional)</span>
            </h2>
            <div className="flex gap-2 mt-3">
              {CONTEXTOS.map(c => (
                <button
                  key={c}
                  onClick={() => setContexto(contexto === c ? null : c)}
                  className={[
                    'px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150 capitalize',
                    contexto === c
                      ? 'bg-dorado text-white border-dorado shadow-sm'
                      : 'bg-white dark:bg-oscuro-surface border-crema-300 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50',
                  ].join(' ')}
                >
                  {c}
                </button>
              ))}
            </div>
          </section>
        )}

        {/* ── Paso nombre ── */}
        {categoria && (
          <section className="mb-6 animate-fade-in">
            <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-1">
              {nombreStep}. Nombre{' '}
              <span className="text-cafe-light/50 dark:text-crema-400/50 font-normal text-xs">(opcional)</span>
            </h2>
            <p className="text-[11px] text-cafe-light/70 dark:text-crema-400/70 mb-3 leading-snug">
              Nombre de pila o apodo (máx. 2 palabras). Sin apellidos ni datos personales.
            </p>

            {/* Sin nombre toggle */}
            <label className="flex items-center gap-2.5 mb-3 cursor-pointer w-fit">
              <div
                onClick={() => { setSinNombre(!sinNombre); setNombre(''); setNombreError(null) }}
                className={[
                  'w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  sinNombre
                    ? 'bg-dorado border-dorado'
                    : 'bg-white dark:bg-oscuro-surface border-crema-300 dark:border-oscuro-border',
                ].join(' ')}
              >
                {sinNombre && <Icon name="check" size={12} className="text-white" />}
              </div>
              <span className="text-sm text-cafe-light dark:text-crema-300">
                Sin nombre — aparecerá como <em>"Anónimo"</em>
              </span>
            </label>

            {!sinNombre && (
              <div>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => handleNombreChange(e.target.value)}
                  placeholder="Ej: Francisco, María José…"
                  maxLength={25}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  className="w-full rounded-xl border border-crema-300 dark:border-oscuro-border
                             bg-white dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
                             px-4 py-3 text-sm outline-none focus:border-dorado/60 transition-colors"
                />
                {nombreError && <p className="text-xs text-red-500 mt-1.5">{nombreError}</p>}
                <p className="text-[10px] text-cafe-light/50 dark:text-crema-400/50 mt-1 text-right">
                  {nombre.length}/25
                </p>
              </div>
            )}
          </section>
        )}

        {/* Preview */}
        {previewText && (
          <div className="mb-6 rounded-2xl bg-dorado/10 dark:bg-dorado/15 border border-dorado/25 px-5 py-4 animate-fade-in">
            <p className="text-[10px] font-bold uppercase tracking-widest text-dorado mb-1">Vista previa</p>
            <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 text-base">
              {previewText}
            </p>
          </div>
        )}

        {/* Verificación */}
        {categoria && (
          <section className="mb-6">
            <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-3">
              Verificación
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-xs text-cafe-light dark:text-crema-300 mb-1.5 block">
                  ¿Cuánto es {captcha.a} + {captcha.b}?
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  value={captchaInput}
                  onChange={e => { setCaptchaInput(e.target.value); setCaptchaError(null) }}
                  placeholder="Resultado…"
                  className="w-full rounded-xl border border-crema-300 dark:border-oscuro-border
                             bg-white dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
                             px-4 py-3 text-sm outline-none focus:border-dorado/60 transition-colors"
                />
              </div>
              <button
                onClick={handleRefreshCaptcha}
                className="mt-5 w-10 h-10 flex items-center justify-center rounded-full
                           bg-crema-200 dark:bg-oscuro-surface border border-crema-300 dark:border-oscuro-border
                           text-cafe-light dark:text-crema-300 hover:border-dorado/40 transition-colors"
                aria-label="Nueva pregunta"
              >
                <Icon name="refresh" size={16} />
              </button>
            </div>
            {captchaError && <p className="text-xs text-red-500 mt-1.5">{captchaError}</p>}
          </section>
        )}

        {/* Consentimiento */}
        {categoria && (
          <section className="mb-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <div
                onClick={() => setAccepted(!accepted)}
                className={[
                  'mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all',
                  accepted
                    ? 'bg-dorado border-dorado'
                    : 'bg-white dark:bg-oscuro-surface border-crema-300 dark:border-oscuro-border',
                ].join(' ')}
              >
                {accepted && <Icon name="check" size={12} className="text-white" />}
              </div>
              <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                Entiendo que este pedido será visible públicamente durante 7 días y no contiene datos personales sensibles.
              </p>
            </label>
          </section>
        )}

        {submitError && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                          px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}

        {categoria && (
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Enviando…
              </>
            ) : (
              <>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Enviar pedido
              </>
            )}
          </button>
        )}

        <p className="text-[10px] text-cafe-light/50 dark:text-crema-400/50 text-center mt-4 leading-snug">
          Los pedidos se muestran de forma anónima. No se almacenan datos de identificación personal.
        </p>

        <div className="pb-28 lg:pb-10" />
      </div>

      {/* ── Confetti overlay — fixed, cubre toda la pantalla ── */}
      {confetti && (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 999 }}>
          {confetti.map(p => (
            <div
              key={p.id}
              className="confetti-piece"
              style={{
                left: '50%',
                top: '55%',
                width:  p.wide ? p.size * 2.2 : p.size,
                height: p.size,
                borderRadius: p.wide ? '2px' : '50%',
                backgroundColor: p.color,
                '--cx':     p.dx,
                '--cy-up':  p.cyUp,
                '--cy-down':p.cyDown,
                '--cr':     p.rot,
                '--cr-mid': p.rotMid,
                '--dur':    `${p.duration}s`,
                '--delay':  `${p.delay}s`,
              } as React.CSSProperties}
            />
          ))}
        </div>
      )}
    </div>
  )
}
