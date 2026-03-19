import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { useAppStore, Theme, FontSize } from '../store/useAppStore'

const FONT_OPTIONS: { value: FontSize; label: string; sample: string }[] = [
  { value: 'small',  label: 'Pequeña',  sample: 'Aa' },
  { value: 'normal', label: 'Normal',   sample: 'Aa' },
  { value: 'large',  label: 'Grande',   sample: 'Aa' },
]

const THEME_OPTIONS: { value: Theme; label: string; accent: string; bg: string }[] = [
  { value: 'claro',    label: 'Claro',    accent: '#8B6914', bg: '#FAF7F0' },
  { value: 'oscuro',   label: 'Oscuro',   accent: '#D4A853', bg: '#1C1510' },
  { value: 'juvenil',  label: 'Juvenil',  accent: '#7C3AED', bg: '#F5F3FF' },
  { value: 'colorido', label: 'Colorido', accent: '#0891B2', bg: '#ECFEFF' },
  { value: 'rosa',     label: 'Rosa',     accent: '#DB2777', bg: '#FDF2F8' },
  { value: 'rojo',     label: 'Rojo',     accent: '#DC2626', bg: '#FEF2F2' },
]

export default function AjustesPage() {
  const { theme, setTheme, fontSize, setFontSize } = useAppStore()

  return (
    <div className="flex flex-col h-screen">
      <PageHeader icon={<Icon name="cog" size={18} />} title="Ajustes" subtitle="Preferencias visuales" />

      <div className="flex-1 overflow-y-auto px-4 py-5 animate-fade-in space-y-6 pb-10">

        {/* ── Tema de color ── */}
        <section>
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
            Tema de color
          </p>
          <div className="card px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              {THEME_OPTIONS.map(({ value, label, accent, bg }) => {
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
                    {/* Swatch */}
                    <div
                      className="w-8 h-8 rounded-full shadow-sm border border-black/10"
                      style={{ backgroundColor: accent }}
                    />
                    <span
                      className={[
                        'text-xs leading-none font-medium',
                        active ? '' : 'text-cafe-dark dark:text-crema-200',
                      ].join(' ')}
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
          </div>
        </section>

        {/* ── Tamaño de letra ── */}
        <section>
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
            Tamaño de letra
          </p>
          <div className="card px-4 py-4">
            <div className="grid grid-cols-3 gap-2">
              {FONT_OPTIONS.map(({ value, label, sample }) => (
                <button
                  key={value}
                  onClick={() => setFontSize(value)}
                  className={[
                    'flex flex-col items-center gap-1.5 py-3 rounded-xl border transition-all duration-150 active:scale-95',
                    fontSize === value
                      ? 'bg-dorado text-white border-dorado shadow-sm'
                      : 'bg-crema-50 dark:bg-oscuro-surface border-crema-200 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50',
                  ].join(' ')}
                >
                  <span className={[
                    'font-serif font-bold leading-none',
                    value === 'small' ? 'text-base' : value === 'large' ? 'text-2xl' : 'text-xl',
                  ].join(' ')}>
                    {sample}
                  </span>
                  <span className="text-xs leading-none">{label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-cafe-light dark:text-crema-400 mt-3 text-center">
              El tamaño afecta a toda la aplicación.
            </p>
          </div>
        </section>

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
                  Gratuito, sin registro, sin publicidad.
                </p>
              </div>
            </div>
          </div>
        </section>

      </div>
    </div>
  )
}
