import { Axis } from '../data/santoAxes'

interface Props {
  axis: Axis
  value: number | null
  onChange: (value: number) => void
}

export default function AxisRater({ axis, value, onChange }: Props) {
  return (
    <div className="card px-4 py-3">
      <p className="text-sm font-semibold text-cafe-dark dark:text-crema-100 mb-0.5">
        {axis.label}
      </p>
      <p className="text-xs text-cafe-light dark:text-crema-400 mb-3 leading-snug">
        {axis.description}
      </p>

      <div className="flex items-center gap-1.5">
        <span className="text-[10px] text-cafe-light dark:text-crema-500 w-7 flex-shrink-0 leading-tight">
          Poco
        </span>

        {[1, 2, 3, 4, 5].map((n) => {
          const isSelected = value === n
          const isFilled = value !== null && n < value
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className={[
                'flex-1 h-10 rounded-xl text-sm font-bold transition-all duration-150 active:scale-95',
                isSelected
                  ? 'bg-dorado text-white shadow-md scale-105'
                  : isFilled
                  ? 'bg-dorado/25 text-dorado border border-dorado/30'
                  : 'bg-crema-50 dark:bg-oscuro-surface text-cafe-light dark:text-crema-400 border border-crema-200 dark:border-oscuro-border hover:border-dorado/50',
              ].join(' ')}
            >
              {n}
            </button>
          )
        })}

        <span className="text-[10px] text-cafe-light dark:text-crema-500 w-9 flex-shrink-0 text-right leading-tight">
          Mucho
        </span>
      </div>
    </div>
  )
}
