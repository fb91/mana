import { useAppStore } from '../store/useAppStore'

interface Props {
  icon: string
  title: string
  subtitle?: string
  onReset?: () => void
}

export default function PageHeader({ icon, title, subtitle, onReset }: Props) {
  const { darkMode, toggleDarkMode } = useAppStore()

  return (
    <header className="sticky top-0 z-10 bg-crema/95 dark:bg-oscuro-bg/95 backdrop-blur-sm
                        border-b border-crema-200 dark:border-oscuro-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{icon}</span>
          <div>
            <h1 className="font-serif text-lg font-semibold text-cafe-dark dark:text-crema-200 leading-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-cafe-light dark:text-crema-300">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onReset && (
            <button
              onClick={onReset}
              className="text-xs text-cafe-light dark:text-crema-300 hover:text-dorado
                         transition-colors px-2 py-1 rounded-lg hover:bg-crema-200 dark:hover:bg-oscuro-surface"
            >
              Reiniciar
            </button>
          )}
          <button
            onClick={toggleDarkMode}
            className="w-8 h-8 flex items-center justify-center rounded-full
                       hover:bg-crema-200 dark:hover:bg-oscuro-surface transition-colors"
            aria-label="Cambiar modo"
          >
            {darkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
    </header>
  )
}
