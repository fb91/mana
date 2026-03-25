import { ReactNode } from 'react'
import Icon from './Icon'

interface Props {
  icon: ReactNode
  title: string
  subtitle?: string
  onReset?: () => void
  actions?: ReactNode
}

export default function PageHeader({ icon, title, subtitle, onReset, actions }: Props) {
  return (
    <header className="sticky top-0 z-10 bg-crema/95 dark:bg-oscuro-bg/95 backdrop-blur-sm
                        border-b border-crema-200 dark:border-oscuro-border px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
            {icon}
          </div>
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
          {actions}
          {onReset && (
            <button
              onClick={onReset}
              className="text-xs text-cafe-light dark:text-crema-300 hover:text-dorado
                         transition-colors px-2 py-1 rounded-lg hover:bg-crema-200 dark:hover:bg-oscuro-surface flex items-center gap-1"
            >
              <Icon name="refresh" size={14} />
              Reiniciar
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
