import { useRef } from 'react'

interface TimePickerProps {
  value: string          // "HH:MM"
  onChange: (value: string) => void
}

export default function TimePicker({ value, onChange }: TimePickerProps) {
  const [rawH, rawM] = value.split(':').map(Number)
  const hours   = isNaN(rawH) ? 8 : rawH
  const minutes = isNaN(rawM) ? 0 : rawM

  // Touch swipe tracking
  const touchStartY = useRef<number | null>(null)

  function set(h: number, m: number) {
    const hh = String(Math.min(23, Math.max(0, h))).padStart(2, '0')
    const mm = String(Math.min(59, Math.max(0, m))).padStart(2, '0')
    onChange(`${hh}:${mm}`)
  }

  function makeHandlers(
    onInc: () => void,
    onDec: () => void,
  ) {
    return {
      onTouchStart: (e: React.TouchEvent) => {
        touchStartY.current = e.touches[0].clientY
      },
      onTouchEnd: (e: React.TouchEvent) => {
        if (touchStartY.current === null) return
        const delta = touchStartY.current - e.changedTouches[0].clientY
        if (Math.abs(delta) < 10) return
        delta > 0 ? onInc() : onDec()
        touchStartY.current = null
      },
    }
  }

  return (
    <div className="flex items-center gap-1 select-none">
      {/* Hours */}
      <Drum
        value={String(hours).padStart(2, '0')}
        onInc={() => set(hours + 1, minutes)}
        onDec={() => set(hours - 1, minutes)}
        swipeHandlers={makeHandlers(
          () => set(hours + 1, minutes),
          () => set(hours - 1, minutes),
        )}
      />

      <span className="text-xl font-bold text-cafe-dark dark:text-crema-200 pb-0.5 mx-0.5">:</span>

      {/* Minutes — solo :00 y :30 para coincidir con el cron cada 30 min */}
      <Drum
        value={minutes < 15 ? '00' : '30'}
        onInc={() => set(hours, minutes < 15 ? 30 : 0)}
        onDec={() => set(hours, minutes < 15 ? 30 : 0)}
        swipeHandlers={makeHandlers(
          () => set(hours, minutes < 15 ? 30 : 0),
          () => set(hours, minutes < 15 ? 30 : 0),
        )}
      />
    </div>
  )
}

interface DrumProps {
  value: string
  onInc: () => void
  onDec: () => void
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent) => void
    onTouchEnd: (e: React.TouchEvent) => void
  }
}

function Drum({ value, onInc, onDec, swipeHandlers }: DrumProps) {
  return (
    <div className="flex flex-col items-center">
      {/* Up button */}
      <button
        type="button"
        onClick={onInc}
        className="w-12 h-9 flex items-center justify-center rounded-t-xl
                   bg-crema-100 dark:bg-oscuro-card border border-crema-200 dark:border-oscuro-border
                   text-cafe-light dark:text-crema-400 active:bg-crema-200 dark:active:bg-oscuro-border
                   transition-colors"
        aria-label="Aumentar"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 9.5L7 4.5L12 9.5" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Display — swipeable */}
      <div
        {...swipeHandlers}
        className="w-12 h-12 flex items-center justify-center
                   bg-crema dark:bg-oscuro-surface border-x border-crema-200 dark:border-oscuro-border
                   text-cafe-dark dark:text-crema-200 font-bold text-xl font-mono
                   cursor-ns-resize touch-none"
      >
        {value}
      </div>

      {/* Down button */}
      <button
        type="button"
        onClick={onDec}
        className="w-12 h-9 flex items-center justify-center rounded-b-xl
                   bg-crema-100 dark:bg-oscuro-card border border-crema-200 dark:border-oscuro-border
                   text-cafe-light dark:text-crema-400 active:bg-crema-200 dark:active:bg-oscuro-border
                   transition-colors"
        aria-label="Disminuir"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
    </div>
  )
}
