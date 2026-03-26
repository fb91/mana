import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { supabase } from '../lib/supabase'

// ── Motivos disponibles ────────────────────────────────────────────────────

const MOTIVOS = [
  'Salud',
  'Trabajo',
  'Familia',
  'Conversión',
  'Estudios',
  'Matrimonio',
  'Hijos',
  'Paz interior',
  'Situación económica',
  'Fortaleza en la fe',
  'Intención particular',
] as const

type Motivo = typeof MOTIVOS[number]

const MOTIVO_PREP: Record<Motivo, string> = {
  'Salud': 'por',
  'Trabajo': 'por',
  'Paz interior': 'por',
  'Familia': 'de',
  'Conversión': 'de',
  'Estudios': 'de',
  'Matrimonio': 'de',
  'Hijos': 'de',
  'Situación económica': 'de',
  'Fortaleza en la fe': 'de',
  'Intención particular': 'de',
}

// ── Validación del nombre ──────────────────────────────────────────────────

const NAME_REGEX = /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/
const NAME_BLACKLIST = [
  'dni', 'doc', 'tel', 'gmail', 'yahoo', 'hotmail', 'outlook',
  'email', 'mail', 'numero', 'celular', 'phone', 'apellido', 'facebook',
  'instagram', 'twitter', 'whatsapp', 'signal',
]

function validateName(raw: string): { valid: boolean; error?: string; normalized?: string } {
  const trimmed = raw.trim()
  if (trimmed.length < 2) return { valid: false, error: 'El nombre debe tener al menos 2 letras.' }
  if (trimmed.length > 30) return { valid: false, error: 'El nombre es demasiado largo (máx. 30 letras).' }
  if (!NAME_REGEX.test(trimmed)) return { valid: false, error: 'Solo letras, sin espacios ni caracteres especiales.' }
  const lower = trimmed.toLowerCase()
  if (NAME_BLACKLIST.some(w => lower.includes(w))) {
    return { valid: false, error: 'No ingreses datos personales.' }
  }
  // Detectar múltiples mayúsculas internas (ej: JuanPerez)
  if (/[A-ZÁÉÍÓÚÑ]/.test(trimmed.slice(1))) {
    return { valid: false, error: 'Ingresá solo el nombre de pila, sin apellido.' }
  }
  const normalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase()
  return { valid: true, normalized }
}

// ── Captcha simple ─────────────────────────────────────────────────────────

interface Captcha {
  a: number
  b: number
  answer: number
}

function generateCaptcha(): Captcha {
  const a = Math.floor(Math.random() * 9) + 1
  const b = Math.floor(Math.random() * 9) + 1
  return { a, b, answer: a + b }
}

// ── Componente principal ───────────────────────────────────────────────────

export default function PedidoOracionPage() {
  const navigate = useNavigate()

  const [motivo, setMotivo] = useState<Motivo | null>(null)
  const [nombre, setNombre] = useState('')
  const [nombreError, setNombreError] = useState<string | null>(null)
  const [captcha, setCaptcha] = useState<Captcha>(generateCaptcha)
  const [captchaInput, setCaptchaInput] = useState('')
  const [captchaError, setCaptchaError] = useState<string | null>(null)
  const [accepted, setAccepted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  // Preview text
  const normalizedName = nombre.trim()
    ? validateName(nombre).normalized ?? ''
    : ''
  const previewText = motivo && normalizedName
    ? `${motivo} ${MOTIVO_PREP[motivo]} ${normalizedName}`
    : null

  const handleNombreChange = useCallback((val: string) => {
    // Block spaces, numbers and most special chars at input level
    const filtered = val.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, '')
    setNombre(filtered)
    setNombreError(null)
  }, [])

  const handleRefreshCaptcha = () => {
    setCaptcha(generateCaptcha())
    setCaptchaInput('')
    setCaptchaError(null)
  }

  async function handleSubmit() {
    setSubmitError(null)

    // Validar captcha
    const captchaNum = parseInt(captchaInput, 10)
    if (isNaN(captchaNum) || captchaNum !== captcha.answer) {
      setCaptchaError('Respuesta incorrecta. Intentá de nuevo.')
      handleRefreshCaptcha()
      return
    }

    // Validar nombre
    const nameResult = validateName(nombre)
    if (!nameResult.valid) {
      setNombreError(nameResult.error ?? 'Nombre inválido.')
      return
    }

    if (!motivo) return
    if (!accepted) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('prayer_requests')
        .insert({ motivo, nombre: nameResult.normalized })

      if (error) throw error
      setSubmitted(true)
    } catch {
      setSubmitError('No se pudo enviar el pedido. Intentá de nuevo.')
      handleRefreshCaptcha()
    } finally {
      setLoading(false)
    }
  }

  const canSubmit = motivo !== null
    && nombre.trim().length >= 2
    && captchaInput.trim().length > 0
    && accepted
    && !loading

  // ── Estado de éxito ──────────────────────────────────────────────────────

  if (submitted) {
    return (
      <div className="flex flex-col h-screen">
        <PageHeader title="Pedido de oración" icon="hands" />
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
          <button
            onClick={() => navigate('/inicio')}
            className="btn-primary"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    )
  }

  // ── Formulario ───────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col h-screen">
      <PageHeader title="Pedido de oración" icon="hands" />

      <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:py-8 animate-fade-in">

        {/* Intro */}
        <p className="text-sm text-cafe-light dark:text-crema-300 leading-relaxed mb-6">
          Pedí oraciones por alguien especial. Tu intención será mostrada de manera
          anónima a la comunidad durante 7 días.
        </p>

        {/* Paso 1: Motivo */}
        <section className="mb-6">
          <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-3">
            1. Elegí un motivo
          </h2>
          <div className="flex flex-wrap gap-2">
            {MOTIVOS.map((m) => (
              <button
                key={m}
                onClick={() => setMotivo(m)}
                className={[
                  'px-3.5 py-2 rounded-full text-sm font-medium border transition-all duration-150',
                  motivo === m
                    ? 'bg-dorado text-white border-dorado shadow-sm'
                    : 'bg-white dark:bg-oscuro-surface border-crema-300 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50',
                ].join(' ')}
              >
                {m}
              </button>
            ))}
          </div>
        </section>

        {/* Paso 2: Nombre */}
        <section className="mb-6">
          <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-1">
            2. Nombre de la persona
          </h2>
          <p className="text-[11px] text-cafe-light/70 dark:text-crema-400/70 mb-3 leading-snug">
            Usá solo el nombre de pila o un apodo. No ingreses datos personales.
          </p>
          <input
            type="text"
            value={nombre}
            onChange={e => handleNombreChange(e.target.value)}
            placeholder="Ej: Francisco, María, Juanito…"
            maxLength={30}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="w-full rounded-xl border border-crema-300 dark:border-oscuro-border
                       bg-white dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
                       px-4 py-3 text-sm outline-none focus:border-dorado/60 transition-colors"
          />
          {nombreError && (
            <p className="text-xs text-red-500 mt-1.5">{nombreError}</p>
          )}
          <p className="text-[10px] text-cafe-light/50 dark:text-crema-400/50 mt-1 text-right">
            {nombre.length}/30
          </p>
        </section>

        {/* Preview */}
        {previewText && (
          <div className="mb-6 rounded-2xl bg-dorado/10 dark:bg-dorado/15 border border-dorado/25 px-5 py-4 animate-fade-in">
            <p className="text-[10px] font-bold uppercase tracking-widest text-dorado mb-1">
              Vista previa
            </p>
            <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 text-base">
              {previewText}
            </p>
          </div>
        )}

        {/* Paso 3: Captcha */}
        <section className="mb-6">
          <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-3">
            3. Verificación
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
          {captchaError && (
            <p className="text-xs text-red-500 mt-1.5">{captchaError}</p>
          )}
        </section>

        {/* Paso 4: Consentimiento */}
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
              Entiendo que este pedido de oración será visible públicamente durante 7 días.
              No contiene datos personales sensibles (apellido, documento, teléfono, etc.).
            </p>
          </label>
        </section>

        {/* Error general */}
        {submitError && (
          <div className="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800
                          px-4 py-3 text-sm text-red-600 dark:text-red-400">
            {submitError}
          </div>
        )}

        {/* Botón enviar */}
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
              <Icon name="hands" size={16} />
              Enviar pedido
            </>
          )}
        </button>

        <p className="text-[10px] text-cafe-light/50 dark:text-crema-400/50 text-center mt-4 leading-snug">
          Los pedidos se muestran de forma anónima. No se almacenan datos de identificación personal.
        </p>

        <div className="pb-28 lg:pb-10" />

      </div>
    </div>
  )
}
