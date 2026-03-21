import { useState } from 'react'
import Icon from './Icon'
import { isSameDay } from '../lib/liturgicalCalendar'

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DAY_HEADERS = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export default function CalendarPicker({
  selectedDate,
  today,
  onSelect,
  onClose,
}: {
  selectedDate: Date
  today: Date
  onSelect: (date: Date) => void
  onClose: () => void
}) {
  const [viewYear, setViewYear] = useState(selectedDate.getFullYear())
  const [viewMonth, setViewMonth] = useState(selectedDate.getMonth())

  const daysInMonth = getDaysInMonth(viewYear, viewMonth)
  const firstDay = getFirstDayOfWeek(viewYear, viewMonth)

  function goMonth(delta: number) {
    let m = viewMonth + delta
    let y = viewYear
    if (m < 0) { m = 11; y-- }
    if (m > 11) { m = 0; y++ }
    setViewMonth(m)
    setViewYear(y)
  }

  function handleSelect(day: number) {
    onSelect(new Date(viewYear, viewMonth, day))
    onClose()
  }

  function goToday() {
    setViewYear(today.getFullYear())
    setViewMonth(today.getMonth())
  }

  const isCurrentMonth = viewYear === today.getFullYear() && viewMonth === today.getMonth()

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-sm bg-crema dark:bg-oscuro-bg rounded-t-3xl sm:rounded-3xl
                      p-5 pb-8 shadow-2xl animate-slide-up">
        {/* Drag handle */}
        <div className="w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-4 sm:hidden" />

        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => goMonth(-1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center
                       bg-crema-100 dark:bg-oscuro-surface active:scale-90 transition-transform"
          >
            <Icon name="chevron-left" size={20} className="text-cafe-dark dark:text-crema-200" />
          </button>

          <button
            onClick={goToday}
            className="flex flex-col items-center"
          >
            <span className="font-serif text-lg font-semibold text-cafe-dark dark:text-crema-200 leading-tight">
              {MONTH_NAMES[viewMonth]}
            </span>
            <span className="text-xs text-cafe-light dark:text-crema-300">
              {viewYear}
              {!isCurrentMonth && (
                <span className="text-dorado ml-1">· ir a hoy</span>
              )}
            </span>
          </button>

          <button
            onClick={() => goMonth(1)}
            className="w-10 h-10 rounded-xl flex items-center justify-center
                       bg-crema-100 dark:bg-oscuro-surface active:scale-90 transition-transform"
          >
            <Icon name="chevron-right" size={20} className="text-cafe-dark dark:text-crema-200" />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_HEADERS.map((d) => (
            <div key={d} className="text-center text-[11px] font-semibold text-cafe-light dark:text-crema-300 py-1.5">
              {d}
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {/* Empty slots before first day */}
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} />
          ))}

          {/* Day buttons */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const date = new Date(viewYear, viewMonth, day)
            const isSelected = isSameDay(date, selectedDate)
            const isToday = isSameDay(date, today)

            return (
              <button
                key={day}
                onClick={() => handleSelect(day)}
                className={`
                  mx-auto w-10 h-10 rounded-xl flex items-center justify-center
                  text-sm font-medium transition-all duration-100 active:scale-90
                  ${isSelected
                    ? 'bg-dorado text-crema-50 shadow-md font-bold'
                    : isToday
                      ? 'bg-dorado/15 text-dorado border border-dorado/30 font-bold'
                      : 'text-cafe-dark dark:text-crema-200 hover:bg-crema-100 dark:hover:bg-oscuro-surface'
                  }
                `}
              >
                {day}
              </button>
            )
          })}
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="w-full text-center text-sm text-cafe-light dark:text-crema-300 mt-5 py-1
                     active:scale-[0.98] transition-all"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
