import { useState } from 'react'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAppStore, Theme, FontFamily, FONT_PRESETS, GARAMOND_FONT_PRESETS } from '../store/useAppStore'
import { getLiturgicalAppColor, LITURGICAL_COLOR_HEX } from '../lib/lectionaryResolver'
import { getLiturgicalContext } from '../lib/liturgicalCalendar'
import { usePWAInstall } from '../hooks/usePWAInstall'
import IOSInstallModal from '../components/IOSInstallModal'
import { BugReportLink } from '../components/BugReportButton'

const FONT_PRESET_OPTIONS = [
  { px: FONT_PRESETS.small,  garamondPx: GARAMOND_FONT_PRESETS.small,  label: 'Pequeña' },
  { px: FONT_PRESETS.normal, garamondPx: GARAMOND_FONT_PRESETS.normal, label: 'Normal'  },
  { px: FONT_PRESETS.large,  garamondPx: GARAMOND_FONT_PRESETS.large,  label: 'Grande'  },
]

const SLIDER_MIN  = 15
const SLIDER_MAX  = 26
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

const STATIC_THEMES: { value: Theme; label: string; accent: string; bg: string; description: string }[] = [
  { value: 'claro',   label: 'Claro',   accent: '#8C5A2B', bg: '#FAF7F2', description: 'Calidez terrena' },
  { value: 'oscuro',  label: 'Oscuro',  accent: '#D4A853', bg: '#1C1510', description: 'Noche cálida'    },
  { value: 'luz',     label: 'Luz',     accent: '#3A6EA5', bg: '#FFFFFF', description: 'Claridad y cielo'},
  { value: 'juvenil', label: 'Juvenil', accent: '#F97316', bg: '#FFFAF5', description: 'Alegría y energía'},
]

export default function AjustesPage() {
  const { theme, setTheme, fontSizeValue, setFontSizeValue, fontFamily, setFontFamily, followSystemDark, setFollowSystemDark } = useAppStore()
  const { state: installState, install } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)

  const currentLiturgicalColor = getLiturgicalAppColor(new Date())
  const currentLiturgicalHex   = LITURGICAL_COLOR_HEX[currentLiturgicalColor]
  const litCtx = getLiturgicalContext(new Date())
  const SEASON_LABELS: Record<string, string> = {
    ADVENT: 'Adviento', CHRISTMAS: 'Navidad', LENT: 'Cuaresma',
    EASTER: 'Pascua', ORDINARY: 'Tiempo Ordinario',
  }
  const currentSeasonLabel = SEASON_LABELS[litCtx.season] ?? ''

  return (
    <div className="flex flex-col h-screen">
      <PageHeader icon={<Icon name="cog" size={18} />} title="Ajustes" subtitle="Preferencias visuales" />

      <div className="flex-1 overflow-y-auto px-4 py-5 animate-fade-in space-y-6 pb-28">
        {/* Install Modal - universal para iOS, Android, Windows, etc */}
        <IOSInstallModal show={showIOSModal} onClose={() => setShowIOSModal(false)} />

        {/* ── Tema de color ── */}
        <section>
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
            Tema de color
          </p>
          <div className="card px-4 py-4 space-y-3">

            {/* Los 4 temas base en rejilla 2×2 */}
            <div className="grid grid-cols-2 gap-2">
              {STATIC_THEMES.map(({ value, label, accent, bg, description }) => {
                const active = theme === value
                return (
                  <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={[
                      'flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border transition-all duration-150 active:scale-95',
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
                      className="text-xs leading-none font-semibold"
                      style={active ? { color: accent } : undefined}
                    >
                      {label}
                    </span>
                    <span
                      className="text-[10px] leading-none text-center"
                      style={{ color: active ? `${accent}CC` : undefined }}
                    >
                      {description}
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

            {/* Tema litúrgico — botón ancho completo */}
            {(() => {
              const active = theme === 'liturgico'
              return (
                <button
                  onClick={() => setTheme('liturgico')}
                  className={[
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all duration-150 active:scale-[0.98]',
                    active
                      ? 'border-[2px] shadow-sm'
                      : 'bg-crema-50 dark:bg-oscuro-surface border-crema-200 dark:border-oscuro-border hover:border-dorado/50',
                  ].join(' ')}
                  style={active ? { borderColor: currentLiturgicalHex, backgroundColor: '#FAF7F2' } : undefined}
                >
                  <div
                    className="w-8 h-8 rounded-full shadow-sm border border-black/10 flex-shrink-0"
                    style={{ backgroundColor: currentLiturgicalHex }}
                  />
                  <div className="flex-1 text-left">
                    <p
                      className="text-sm font-semibold leading-none"
                      style={active ? { color: currentLiturgicalHex } : undefined}
                    >
                      Litúrgico
                    </p>
                    <p
                      className="text-xs mt-0.5 leading-snug"
                      style={{ color: active ? `${currentLiturgicalHex}BB` : undefined }}
                    >
                      Acento según el tiempo litúrgico · Hoy: {currentSeasonLabel}
                    </p>
                  </div>
                  {active && (
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: currentLiturgicalHex }}
                    >
                      <Icon name="check" size={11} className="text-white" />
                    </span>
                  )}
                </button>
              )
            })()}

            {/* Seguir tema del sistema — solo mobile */}
            <label className="sm:hidden flex items-center gap-3 px-1 py-1 cursor-pointer select-none">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200 leading-none">
                  Seguir tema del dispositivo
                </p>
                <p className="text-xs text-cafe-light dark:text-crema-300 mt-1 leading-snug">
                  Cambia a oscuro automáticamente si el sistema usa modo oscuro
                </p>
              </div>
              <div className="flex-shrink-0">
                <input
                  type="checkbox"
                  checked={followSystemDark}
                  onChange={e => setFollowSystemDark(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={[
                    'w-11 h-6 rounded-full transition-colors duration-200 relative',
                    followSystemDark ? 'bg-dorado' : 'bg-crema-300 dark:bg-oscuro-border',
                  ].join(' ')}
                >
                  <span
                    className={[
                      'absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200',
                      followSystemDark ? 'translate-x-5' : 'translate-x-0.5',
                    ].join(' ')}
                  />
                </div>
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

            {/* Fine-grained controls */}
            <div className="flex items-center justify-center gap-3 px-1">
              <button
                onClick={() => setFontSizeValue(Math.max(SLIDER_MIN, fontSizeValue - SLIDER_STEP))}
                disabled={fontSizeValue <= SLIDER_MIN}
                className="w-10 h-10 rounded-lg border-2 border-crema-200 dark:border-oscuro-border bg-crema-50 dark:bg-oscuro-surface flex items-center justify-center text-cafe-dark dark:text-crema-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-dorado/50 active:scale-95 transition-all duration-150"
              >
                <Icon name="minus" size={16} />
              </button>
              
              <div className="flex flex-col items-center gap-1">
                <span className="text-xl font-bold text-dorado tabular-nums">
                  {Number.isInteger(fontSizeValue) ? fontSizeValue : fontSizeValue.toFixed(1)} px
                </span>
                <div className="flex items-center gap-1 text-[10px] text-cafe-light dark:text-crema-400">
                  <span>{SLIDER_MIN} px</span>
                  <span>—</span>
                  <span>{SLIDER_MAX} px</span>
                </div>
              </div>
              
              <button
                onClick={() => setFontSizeValue(Math.min(SLIDER_MAX, fontSizeValue + SLIDER_STEP))}
                disabled={fontSizeValue >= SLIDER_MAX}
                className="w-10 h-10 rounded-lg border-2 border-crema-200 dark:border-oscuro-border bg-crema-50 dark:bg-oscuro-surface flex items-center justify-center text-cafe-dark dark:text-crema-200 disabled:opacity-40 disabled:cursor-not-allowed hover:border-dorado/50 active:scale-95 transition-all duration-150"
              >
                <Icon name="plus" size={16} />
              </button>
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
                  <button
                    onClick={() => setShowIOSModal(true)}
                    className="btn-secondary w-full"
                  >
                    Ver instrucciones
                  </button>
                </div>
              ) : installState === 'ios' ? (
                <div className="space-y-3">
                  <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                    Instalá Maná para acceder a la Biblia y lecturas del día sin conexión.
                  </p>
                  <button
                    onClick={() => setShowIOSModal(true)}
                    className="btn-primary w-full flex items-center justify-center gap-2"
                  >
                    <Icon name="sparkles" size={16} />
                    Ver cómo instalar
                  </button>
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
                del Vaticano (<em>El libro del pueblo de Dios (1990)</em>).
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
                  Un proyecto sin ánimos de lucro, desarrollado para acompañar la vida
                  espiritual de las personas. Este proyecto es muy reciente y se encuentra en etapa 
                  de desarrollo, posiblemente encuentres errores: por favor reportarlo usando el enlace 
                  ubicado al final de cada página. Muchas gracias!
                </p>
              </div>
            </div>
            <div className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-lg bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
                <Icon name="user" size={16} />
              </div>
              <div>
                <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                  Software libre, gratuito y sin registro. Si sos desarrollador y te interesa contribuir con este proyecto visita el <a href="https://github.com/fb91/mana" className="text-dorado hover:underline" target="_blank" rel="noopener noreferrer">repositorio en GitHub</a>.
                </p>
              </div>
            </div>
          </div>
        </section>

        <BugReportLink />

      </div>
    </div>
  )
}
