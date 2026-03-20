import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAppStore, Theme, FontFamily, FONT_PRESETS, GARAMOND_FONT_PRESETS } from '../store/useAppStore'
import { getLiturgicalAppColor, LITURGICAL_COLOR_LABELS, LITURGICAL_COLOR_HEX } from '../lib/lectionaryResolver'
import { usePWAInstall } from '../hooks/usePWAInstall'

const FONT_PRESET_OPTIONS = [
  { px: FONT_PRESETS.small,  garamondPx: GARAMOND_FONT_PRESETS.small,  label: 'Pequeña' },
  { px: FONT_PRESETS.normal, garamondPx: GARAMOND_FONT_PRESETS.normal, label: 'Normal'  },
  { px: FONT_PRESETS.large,  garamondPx: GARAMOND_FONT_PRESETS.large,  label: 'Grande'  },
]

const SLIDER_MIN  = 11
const SLIDER_MAX  = 22
const SLIDER_STEP = 0.5

const FONT_FAMILY_OPTIONS: { value: FontFamily; label: string; description: string; style: React.CSSProperties }[] = [
  {
    value: 'inter',
    label: 'Inter',
    description: 'Moderna y clara',
    style: { fontFamily: 'Inter, sans-serif' },
  },
  {
    value: 'garamond',
    label: 'Garamond',
    description: 'Clásica y litúrgica',
    style: { fontFamily: "'EB Garamond', Georgia, serif" },
  },
  {
    value: 'cinzel',
    label: 'Cinzel',
    description: 'Inscripciones romanas',
    style: { fontFamily: "'Cinzel', Georgia, serif" },
  },
]

const STATIC_THEMES: { value: Theme; label: string; accent: string; bg: string }[] = [
  { value: 'claro',  label: 'Claro',  accent: '#965519', bg: '#FAF7F0' },
  { value: 'oscuro', label: 'Oscuro', accent: '#D4A853', bg: '#1C1510' },
]

export default function AjustesPage() {
  const { theme, setTheme, fontSizeValue, setFontSizeValue, fontFamily, setFontFamily, liturgicalAccent, setLiturgicalAccent } = useAppStore()
  const { state: installState, install } = usePWAInstall()
  const [showIOSInstructions, setShowIOSInstructions] = useState(false)

  const sliderPercent = ((fontSizeValue - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100

  const currentLiturgicalColor = getLiturgicalAppColor(new Date())
  const currentLiturgicalHex   = LITURGICAL_COLOR_HEX[currentLiturgicalColor]
  const currentLiturgicalLabel = LITURGICAL_COLOR_LABELS[currentLiturgicalColor]

  return (
    <div className="flex flex-col h-screen">
      <PageHeader icon={<Icon name="cog" size={18} />} title="Ajustes" subtitle="Preferencias visuales" />

      <div className="flex-1 overflow-y-auto px-4 py-5 animate-fade-in space-y-6 pb-28">

        {/* ── Tema de color ── */}
        <section>
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
            Tema de color
          </p>
          <div className="card px-4 py-4 space-y-3">

            {/* Base themes: Claro y Oscuro */}
            <div className="grid grid-cols-2 gap-2">
              {STATIC_THEMES.map(({ value, label, accent, bg }) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={[
                      'flex flex-col items-center gap-2 py-3 rounded-xl border transition-all duration-150 active:scale-95',
                      active
                        ? 'border-[2px] shadow-sm'
                        : 'bg-crema-50 dark:bg-oscuro-surface border-crema-200 dark:border-oscuro-border hover:border-dorado/50',
                    ].join(' ')}
                    style={active ? { borderColor: accent, backgroundColor: bg } : undefined}
                  >
                    <div
                      className="w-8 h-8 rounded-full shadow-sm border border-black/10"
                      style={{ backgroundColor: accent }}
                    />
                    <span
                      className="text-xs leading-none font-medium"
                      style={active ? { color: accent } : undefined}
                    >
                      {label}
                    </span>
                    {active && (
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: accent }}
                      >
                        <Icon name="check" size={10} className="text-white" />
                      </span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Liturgical accent checkbox */}
            <label className="flex items-start gap-3 px-1 py-1 cursor-pointer select-none">
              {/* Checkbox */}
              <div className="flex-shrink-0 mt-0.5">
                <input
                  type="checkbox"
                  checked={liturgicalAccent}
                  onChange={e => setLiturgicalAccent(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={[
                    'w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-150',
                    liturgicalAccent
                      ? 'border-transparent'
                      : 'border-crema-300 dark:border-oscuro-border bg-transparent',
                  ].join(' ')}
                  style={liturgicalAccent ? { backgroundColor: currentLiturgicalHex } : undefined}
                >
                  {liturgicalAccent && (
                    <Icon name="check" size={12} className="text-white" />
                  )}
                </div>
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200 leading-none">
                  Realce litúrgico
                </p>
                <p className="text-xs text-cafe-light dark:text-crema-300 mt-1 leading-snug">
                  El color de acento cambia automáticamente según el tiempo del año litúrgico
                </p>
                {liturgicalAccent && (
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: currentLiturgicalHex }}
                    />
                    <span className="text-[11px] font-medium" style={{ color: currentLiturgicalHex }}>
                      Hoy: {currentLiturgicalLabel}
                    </span>
                  </div>
                )}
              </div>
            </label>

          </div>
        </section>

        {/* ── Tamaño de letra ── */}
        <section>
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
            Tamaño de letra
          </p>
          <div className="card px-4 py-4 space-y-4">

            {/* Preset buttons */}
            <div className="grid grid-cols-3 gap-2">
              {FONT_PRESET_OPTIONS.map(({ px, garamondPx, label }, i) => {
                const activePx = (fontFamily ?? 'inter') === 'garamond' ? garamondPx : px
                const active = fontSizeValue === activePx
                const previewSizes = ['1rem', '1.25rem', '1.5rem']
                return (
                  <button
                    key={label}
                    onClick={() => setFontSizeValue(activePx)}
                    className={[
                      'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-150 active:scale-95',
                      active
                        ? 'bg-dorado text-white border-dorado shadow-sm'
                        : 'bg-crema-50 dark:bg-oscuro-surface border-crema-200 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50',
                    ].join(' ')}
                  >
                    <span
                      className="font-serif font-bold leading-none"
                      style={{ fontSize: previewSizes[i] }}
                    >
                      Aa
                    </span>
                    <span className="text-xs leading-none">{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Fine-grained slider */}
            <div className="space-y-2 px-1">
              <input
                type="range"
                min={SLIDER_MIN}
                max={SLIDER_MAX}
                step={SLIDER_STEP}
                value={fontSizeValue}
                onChange={e => setFontSizeValue(Number(e.target.value))}
                className="slider-themed w-full"
                style={{
                  background: `linear-gradient(to right, rgb(var(--accent)) ${sliderPercent}%, rgb(var(--slider-track)) ${sliderPercent}%)`,
                }}
              />
              <div className="flex justify-between items-center">
                <span className="text-[10px] text-cafe-light dark:text-crema-400">{SLIDER_MIN} px</span>
                <span className="text-xs font-semibold text-dorado tabular-nums">
                  {Number.isInteger(fontSizeValue) ? fontSizeValue : fontSizeValue.toFixed(1)} px
                </span>
                <span className="text-[10px] text-cafe-light dark:text-crema-400">{SLIDER_MAX} px</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── Tipografía ── */}
        <section>
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
            Tipografía
          </p>
          <div className="card px-4 py-4 space-y-2">
            {FONT_FAMILY_OPTIONS.map(({ value, label, description, style }) => {
              const active = (fontFamily ?? 'inter') === value
              return (
                <button
                  key={value}
                  onClick={() => setFontFamily(value)}
                  className={[
                    'w-full flex items-center gap-4 px-4 py-3 rounded-xl border transition-all duration-150 active:scale-[0.98]',
                    active
                      ? 'border-dorado bg-dorado/5 dark:bg-dorado/10 shadow-sm'
                      : 'bg-crema-50 dark:bg-oscuro-surface border-crema-200 dark:border-oscuro-border hover:border-dorado/50',
                  ].join(' ')}
                >
                  <span
                    className="text-2xl font-semibold leading-none flex-shrink-0 w-10 text-center"
                    style={{ ...style, color: active ? 'rgb(var(--accent))' : undefined }}
                  >
                    Aa
                  </span>
                  <div className="flex-1 text-left">
                    <p
                      className="text-sm font-semibold leading-none"
                      style={{ ...style, color: active ? 'rgb(var(--accent))' : undefined }}
                    >
                      {label}
                    </p>
                    <p className="text-xs text-cafe-light dark:text-crema-300 mt-1">{description}</p>
                  </div>
                  {active && (
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: 'rgb(var(--accent))' }}
                    >
                      <Icon name="check" size={11} className="text-white" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </section>

        {/* ── Instalar app ── */}
        {installState !== 'unavailable' && (
          <section>
            <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
              Instalar aplicación
            </p>
            <div className="card px-4 py-4">
              {installState === 'installed' ? (
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
                    <Icon name="check" size={16} />
                  </div>
                  <p className="text-sm text-cafe-dark dark:text-crema-200">
                    Maná ya está instalada en tu dispositivo.
                  </p>
                </div>
              ) : installState === 'prompt' ? (
                <div className="space-y-3">
                  <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                    Instalá Maná en tu dispositivo para acceder más rápido, sin abrir el navegador.
                  </p>
                  <button
                    onClick={install}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Icon name="sparkles" size={16} />
                    Instalar Maná
                  </button>
                </div>
              ) : installState === 'ios' ? (
                <div className="space-y-3">
                  <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                    Para instalar Maná en tu iPhone o iPad, abrí esta página en <strong className="text-cafe-dark dark:text-crema-200">Safari</strong> y seguí estos pasos:
                  </p>
                  {showIOSInstructions ? (
                    <ol className="space-y-2 text-xs text-cafe-dark dark:text-crema-200">
                      <li className="flex gap-2"><span className="text-dorado font-bold shrink-0">1.</span>Tocá el botón <strong>Compartir</strong> (el cuadrado con flecha hacia arriba) en la barra de Safari</li>
                      <li className="flex gap-2"><span className="text-dorado font-bold shrink-0">2.</span>Desplazate hacia abajo y tocá <strong>Agregar a pantalla de inicio</strong></li>
                      <li className="flex gap-2"><span className="text-dorado font-bold shrink-0">3.</span>Tocá <strong>Agregar</strong> en la esquina superior derecha</li>
                    </ol>
                  ) : (
                    <button
                      onClick={() => setShowIOSInstructions(true)}
                      className="btn-secondary w-full text-sm"
                    >
                      Ver instrucciones
                    </button>
                  )}
                </div>
              ) : null}
            </div>
          </section>
        )}

        {/* ── Sobre el contenido ── */}
        <section>
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
            Sobre el contenido generado
          </p>
          <div className="card px-4 py-4 space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
                <Icon name="clipboard" size={16} />
              </div>
              <p className="text-xs text-cafe-dark dark:text-crema-200 leading-relaxed">
                Esta aplicación es muy reciente y se encuentra en etapa de desarrollo, en caso de encontrar 
                un error, por favor reportarlo usando el botón ubicado en el extremo superior derecho de la app. 
                Muchas gracias!
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
                <Icon name="sparkles" size={16} />
              </div>
              <p className="text-xs text-cafe-dark dark:text-crema-200 leading-relaxed">
                Todo el contenido generado por inteligencia artificial en esta aplicación está
                configurado para responder conforme al <strong>Magisterio de la Iglesia Católica</strong>.
                Sin embargo, al tratarse de IA, puede cometer errores. Ante cualquier duda doctrinal
                o espiritual, se recomienda siempre consultarlo personalmente con un sacerdote.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
                <Icon name="book-open" size={16} />
              </div>
              <p className="text-xs text-cafe-dark dark:text-crema-200 leading-relaxed">
                Todas las citas bíblicas que aparecen en esta aplicación <strong>no están generadas
                por IA</strong>: son tomadas directamente de la traducción oficial del sitio web
                del Vaticano (<em>Nueva Biblia de Jerusalén</em>).
              </p>
            </div>
          </div>
        </section>

        {/* ── Acerca de ── */}
        <section>
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
            Acerca de Maná
          </p>
          <div className="card px-4 py-4 space-y-3">
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
                <Icon name="sun" size={16} />
              </div>
              <div>
                <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200 mb-1">
                  Maná — Aplicación Espiritual Católica
                </p>
                <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                  Un proyecto sin ánimos de lucro, desarrollado con amor para acompañar la vida
                  espiritual de las personas.
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
                <Icon name="user" size={16} />
              </div>
              <div>
                <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                  Desarrollado por <strong className="text-cafe-dark dark:text-crema-200">Fabricio Bianchi</strong>.
                  Gratuito y sin registro.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
