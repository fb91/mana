import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { api, BibleVerse, LectioBiblicaResponse, BibleChapter } from '../services/api'
import { downloadLectioPDF } from '../lib/lectio-pdf'
import { getLiturgicalContext, addDays, isSameDay } from '../lib/liturgicalCalendar'
import { resolveDay, ResolvedDay, COLOR_STYLES, RANK_LABEL } from '../lib/lectionaryResolver'
import { parseBibleRef, formatRef, getBookName } from '../lib/bibleRefParser'
import { shareOrDownload, canGospelFitInImage } from '../lib/shareCard'
import { BugReportLink } from '../components/BugReportButton'

// ── Types ─────────────────────────────────────────────────────────────────────

type ReadingKey = 'first' | 'second' | 'psalm' | 'gospel'
type LoadedVerses = Partial<Record<ReadingKey, BibleVerse[]>>

// ── Helper: format date for display ─────────────────────────────────────────

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDayShort(date: Date): string {
  const days = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return days[date.getDay()]
}

function formatDayNum(date: Date): string {
  return String(date.getDate())
}

function formatMonthShort(date: Date): string {
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
  return months[date.getMonth()]
}

// ── Day Navigator ─────────────────────────────────────────────────────────────

function DayNavigator({
  selectedDate,
  today,
  onSelect,
}: {
  selectedDate: Date
  today: Date
  onSelect: (date: Date) => void
}) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const buttonRefs = useRef<Map<string, HTMLButtonElement>>(new Map())
  const hasScrolledInitially = useRef(false)
  const dateInputRef = useRef<HTMLInputElement>(null)

  // Build ±10 days window centered on selectedDate
  const center = selectedDate
  const days: Date[] = []
  for (let i = -10; i <= 10; i++) {
    days.push(addDays(center, i))
  }

  // Scroll to selected date on mount and when it changes
  useEffect(() => {
    const scrollToDate = (date: Date) => {
      const key = date.toISOString()
      const button = buttonRefs.current.get(key)
      if (button) {
        button.scrollIntoView({ behavior: hasScrolledInitially.current ? 'smooth' : 'auto', block: 'nearest', inline: 'center' })
        hasScrolledInitially.current = true
      }
    }

    // Use a slight delay to ensure buttons are rendered
    const timer = setTimeout(() => {
      scrollToDate(selectedDate)
    }, 50)

    return () => clearTimeout(timer)
  }, [selectedDate])

  const isSelected = (d: Date) => isSameDay(d, selectedDate)
  const isToday = (d: Date) => isSameDay(d, today)

  const setButtonRef = (date: Date, el: HTMLButtonElement | null) => {
    const key = date.toISOString()
    if (el) {
      buttonRefs.current.set(key, el)
    } else {
      buttonRefs.current.delete(key)
    }
  }

  return (
    <div className="relative">
      {/* Scroll strip */}
      <div
        ref={scrollRef}
        className="flex gap-1.5 overflow-x-auto scrollbar-hide px-4 py-3"
      >
        {days.map((day) => {
          const selected = isSelected(day)
          const todayDay = isToday(day)
          return (
            <button
              key={day.toISOString()}
              ref={(el) => setButtonRef(day, el)}
              onClick={() => onSelect(day)}
              className={`flex-shrink-0 flex flex-col items-center gap-0.5 rounded-2xl px-3 py-2.5
                          transition-all duration-150 active:scale-95 min-w-[52px]
                          ${selected
                ? 'bg-dorado text-crema-50 shadow-md'
                : todayDay
                  ? 'bg-dorado/15 text-dorado border border-dorado/30'
                  : 'bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border text-cafe-dark dark:text-crema-200'
              }`}
            >
              <span className={`text-[10px] font-semibold uppercase tracking-wide leading-none
                                ${selected ? 'text-crema-50' : todayDay ? 'text-dorado' : 'text-cafe-light dark:text-crema-300'}`}>
                {formatDayShort(day)}
              </span>
              <span className={`text-lg font-bold leading-none ${selected ? 'text-crema-50' : ''}`}>
                {formatDayNum(day)}
              </span>
              <span className={`text-[10px] leading-none
                                ${selected ? 'text-crema-50/80' : todayDay ? 'text-dorado' : 'text-cafe-light dark:text-crema-300'}`}>
                {formatMonthShort(day)}
              </span>
              {todayDay && !selected && (
                <span className="w-1 h-1 rounded-full bg-dorado mt-0.5" />
              )}
            </button>
          )
        })}
      </div>

      {/* Calendar picker + back to today */}
      <div className="flex justify-center gap-2 pb-1">
        {/* Hidden native date input */}
        <input
          ref={dateInputRef}
          type="date"
          className="sr-only"
          tabIndex={-1}
          value={selectedDate.toISOString().slice(0, 10)}
          onChange={(e) => {
            if (e.target.value) {
              const [y, m, d] = e.target.value.split('-').map(Number)
              onSelect(new Date(y, m - 1, d))
            }
          }}
        />
        <button
          onClick={() => dateInputRef.current?.showPicker()}
          className="flex items-center gap-1.5 text-xs text-dorado font-semibold
                     bg-dorado/10 border border-dorado/30 rounded-full px-3 py-1.5
                     active:scale-95 transition-all"
        >
          <Icon name="calendar" size={13} />
          Elegir fecha
        </button>
        {!isSameDay(selectedDate, today) && (
          <button
            onClick={() => onSelect(today)}
            className="flex items-center gap-1.5 text-xs text-dorado font-semibold
                       bg-dorado/10 border border-dorado/30 rounded-full px-3 py-1.5
                       active:scale-95 transition-all"
          >
            <Icon name="refresh" size={13} />
            Volver a hoy
          </button>
        )}
      </div>
    </div>
  )
}

// ── Celebration Banner ────────────────────────────────────────────────────────

function CelebrationBanner({ day, date }: { day: ResolvedDay; date: Date }) {
  const styles = COLOR_STYLES[day.color] ?? COLOR_STYLES.green
  const rankLabel = RANK_LABEL[day.rank]

  return (
    <div className={`rounded-2xl border p-4 ${styles.bg} ${styles.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          {rankLabel && (
            <span className={`text-[10px] font-bold uppercase tracking-widest ${styles.text} opacity-70`}>
              {rankLabel}
            </span>
          )}
          <h2 className={`font-serif text-lg font-semibold leading-snug mt-0.5 ${styles.text}`}>
            {day.celebrationName}
          </h2>
          <p className={`text-xs mt-1 capitalize ${styles.text} opacity-70`}>
            {formatDateLabel(date)}
          </p>
        </div>
        <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${styles.bg}`}>
          <span className={`w-2.5 h-2.5 rounded-full ${styles.dot}`} />
        </div>
      </div>
      {day.label !== day.celebrationName && (
        <div className={`mt-2 pt-2 border-t ${styles.border} opacity-70`}>
          <p className={`text-xs ${styles.text}`}>{day.label}</p>
        </div>
      )}
      <div className={`mt-2 flex gap-3 text-[10px] font-mono ${styles.text} opacity-60`}>
        <span>Ciclo {day.sundayCycle}</span>
        <span>·</span>
        <span>Año {day.yearCycle}</span>
      </div>
    </div>
  )
}

// ── Reading Card ──────────────────────────────────────────────────────────────

function ReadingCard({
  label,
  reference,
  verses,
  loading,
  onExpand,
  expanded,
  accentColor,
}: {
  label: string
  reference: string
  verses: BibleVerse[] | undefined
  loading: boolean
  onExpand: () => void
  expanded: boolean
  accentColor: string
}) {
  const refs = parseBibleRef(reference)
  const bookName = refs.length > 0 ? getBookName(refs[0].book) : ''
  const refDisplay = formatRef(reference)

  return (
    <div className="card overflow-hidden">
      {/* Header */}
      <button
        onClick={onExpand}
        className="w-full flex items-center justify-between text-left"
      >
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest mb-0.5 ${accentColor}`}>
            {label}
          </p>
          <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 text-sm leading-tight">
            {bookName}
          </p>
          <p className={`text-xs ${accentColor} font-medium mt-0.5`}>
            {refDisplay}
          </p>
        </div>
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-transform duration-200
                         ${expanded ? 'rotate-180' : ''} bg-crema-100 dark:bg-oscuro-bg`}>
          <Icon name="chevron-down" size={16} className="text-cafe-light dark:text-crema-300" />
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-crema-200 dark:border-oscuro-border animate-fade-in">
          {loading ? (
            <div className="flex justify-center py-6 animate-pulse-soft">
              <span className="text-2xl">📖</span>
            </div>
          ) : verses && verses.length > 0 ? (
            <div className="space-y-1">
              {verses.map((v) => (
                <p key={v.number} className="font-serif text-base text-cafe-dark dark:text-crema-200 leading-relaxed">
                  <span className="text-dorado font-bold text-xs mr-2 align-top leading-6 select-none">
                    {v.number}
                  </span>
                  {v.text}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-sm text-cafe-light dark:text-crema-300 text-center py-4">
              Texto no disponible. Referencia: <span className="font-medium">{refDisplay}</span>
            </p>
          )}
        </div>
      )}
    </div>
  )
}

// ── Lectio Divina helpers ─────────────────────────────────────────────────────

function LectioSection({ titulo, color, children }: { titulo: string; color: 'dorado' | 'cafe'; children: React.ReactNode }) {
  const border = color === 'dorado' ? 'border-dorado/40' : 'border-cafe-light/40'
  return (
    <div className={`border-l-2 ${border} pl-4`}>
      <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wider mb-2">{titulo}</p>
      {children}
    </div>
  )
}

function LectioDownloadPDFButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2.5
                 border border-dorado/40 text-dorado rounded-2xl py-3 px-4
                 hover:bg-dorado/10 active:scale-[0.98]
                 transition-all duration-150 group"
    >
      <svg
        className="w-4 h-4 text-dorado group-hover:translate-y-0.5 transition-transform duration-150"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
      </svg>
      <span className="text-sm font-medium">Descargar Lectio en PDF</span>
    </button>
  )
}

// ── Lectio Divina Modal ───────────────────────────────────────────────────────

function LectioDivinaModal({
  gospelRef,
  verses,
  onClose,
}: {
  gospelRef: string
  verses: BibleVerse[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<LectioBiblicaResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const parsed = parseBibleRef(gospelRef)
    if (parsed.length === 0 || verses.length === 0) {
      setError('No se pudo preparar la Lectio.')
      setLoading(false)
      return
    }
    const { book, chapter } = parsed[0]
    const bookName = getBookName(book)
    const verseNumbers = verses.map(v => v.number)
    const verseTexts = verses.map(v => v.text)
    api.getLectioBiblica(book, bookName, chapter, verseNumbers, verseTexts)
      .then(setResult)
      .catch(() => setError('No se pudo preparar la Lectio. Intentá de nuevo.'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const parsed = parseBibleRef(gospelRef)
  const refDisplay = formatRef(gospelRef)
  const fakeChapter: BibleChapter = {
    book: parsed[0]?.book ?? '',
    bookName: parsed[0] ? getBookName(parsed[0].book) : '',
    chapter: parsed[0]?.chapter ?? 1,
    verses,
  }
  const verseNumbers = verses.map(v => v.number)

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-crema dark:bg-oscuro-bg rounded-t-3xl px-5 pt-5 pb-8
                      max-h-[92vh] overflow-y-auto animate-slide-up shadow-2xl">
        <div className="w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />

        <div className="flex items-center justify-between mb-1">
          <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200">
            Lectio Divina
          </h2>
          <button onClick={onClose} className="text-cafe-light dark:text-crema-300 text-sm py-1 px-2">
            cerrar ✕
          </button>
        </div>
        <p className="text-dorado text-sm font-medium mb-4">{refDisplay}</p>

        {/* Verses from Bible JSON */}
        <div className="bg-dorado/10 dark:bg-dorado/15 border border-dorado/30 rounded-2xl p-4 mb-6">
          <div className="space-y-2">
            {verses.map(v => (
              <p key={v.number} className="font-serif text-[15px] text-cafe-dark dark:text-crema-200 leading-relaxed">
                <span className="text-dorado font-bold text-xs mr-2 align-top leading-6 select-none">
                  {v.number}
                </span>
                {v.text}
              </p>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-12 gap-4 animate-pulse-soft">
            <span className="text-5xl">🕯️</span>
            <p className="text-sm text-cafe-light dark:text-crema-300">Preparando tu Lectio Divina...</p>
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : result ? (
          <div className="space-y-6 animate-fade-in">
            <LectioDownloadPDFButton onClick={() => downloadLectioPDF(result, fakeChapter, verseNumbers)} />
            <LectioSection titulo="Lectio · Leer" color="dorado">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.lectio}</p>
            </LectioSection>
            <LectioSection titulo="Meditatio · Meditar" color="cafe">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed mb-3">{result.meditatioIntro}</p>
              <ul className="space-y-2">
                {result.meditatioPreguntas.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-cafe-dark dark:text-crema-200">
                    <span className="text-dorado font-bold mt-0.5 shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </LectioSection>
            <LectioSection titulo="Oratio · Orar" color="dorado">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.oratio}</p>
            </LectioSection>
            <LectioSection titulo="Contemplatio · Contemplar" color="cafe">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.contemplatio}</p>
            </LectioSection>
            <LectioDownloadPDFButton onClick={() => downloadLectioPDF(result, fakeChapter, verseNumbers)} />
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-cafe-light dark:text-crema-300 py-2
                         active:scale-[0.98] transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

// ── Share Preview Modal ────────────────────────────────────────────────────────

function ShareModal({
  day,
  date,
  gospelRef,
  gospelText,
  gospelVerses,
  onClose,
}: {
  day: ResolvedDay
  date: Date
  gospelRef: string
  gospelText: string
  gospelVerses: BibleVerse[]
  onClose: () => void
}) {
  const [sharing, setSharing] = useState(false)
  const [done, setDone] = useState(false)
  const styles = COLOR_STYLES[day.color] ?? COLOR_STYLES.green

  async function handleShare() {
    setSharing(true)
    try {
      await shareOrDownload(
        {
          celebrationName: day.celebrationName,
          liturgicalLabel: day.label,
          dateStr: formatDateLabel(date),
          gospelRef,
          gospelVerses,
          color: day.color,
        },
        `lecturas-${date.toISOString().slice(0, 10)}.png`,
      )
      setDone(true)
      setTimeout(onClose, 1500)
    } catch (error) {
      console.error('Error al compartir:', error)
      alert('Hubo un error al generar la imagen. Por favor, intentá de nuevo.')
    } finally {
      setSharing(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full bg-crema dark:bg-oscuro-bg rounded-t-3xl p-5 pb-8 shadow-2xl animate-slide-up">
        <div className="w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-4" />

        <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200 mb-1">
          Compartir Evangelio del día
        </h2>
        <p className="text-sm text-cafe-light dark:text-crema-300 mb-5">
          Se generará una imagen con el Evangelio del día para que puedas compartirlo.
        </p>

        {/* Preview card */}
        <div className={`rounded-2xl border p-4 mb-5 ${styles.bg} ${styles.border}`}>
          <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${styles.text} opacity-60`}>
            Maná · Lecturas del día
          </p>
          <p className={`font-serif font-semibold text-base ${styles.text}`}>
            {day.celebrationName}
          </p>
          <p className={`text-xs mt-1 capitalize ${styles.text} opacity-70`}>
            {formatDateLabel(date)}
          </p>
          {gospelRef && (
            <p className={`text-xs mt-2 font-medium ${styles.text} opacity-80`}>
              Evangelio: {formatRef(gospelRef)}
            </p>
          )}
          {gospelText && (
            <p className={`text-xs mt-1 italic ${styles.text} opacity-60 line-clamp-2`}>
              "{gospelText.slice(0, 120)}…"
            </p>
          )}
        </div>

        {done ? (
          <div className="flex items-center justify-center gap-2 py-3 text-green-600 dark:text-green-400">
            <Icon name="check" size={20} />
            <span className="font-medium text-sm">¡Compartido!</span>
          </div>
        ) : (
          <button
            onClick={handleShare}
            disabled={sharing}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {sharing ? (
              <span className="text-sm">Generando imagen...</span>
            ) : (
              <>
                <Icon name="share" size={18} />
                <span>Generar imagen</span>
              </>
            )}
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-cafe-light dark:text-crema-300 mt-3 py-1"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LiturgiaPage() {
  const today = useRef(new Date()).current
  const location = useLocation()
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [resolvedDay, setResolvedDay] = useState<ResolvedDay | null>(null)
  const [expanded, setExpanded] = useState<Set<ReadingKey>>(new Set(['gospel']))
  const [loadedVerses, setLoadedVerses] = useState<LoadedVerses>({})
  const [loadingVerses, setLoadingVerses] = useState<Set<ReadingKey>>(new Set())
  const [showLectio, setShowLectio] = useState(false)
  const [showShare, setShowShare] = useState(false)

  // Jump to today when BottomNav "Lecturas" is pressed while already on this page
  useEffect(() => {
    if ((location.state as { goToToday?: number } | null)?.goToToday) {
      setSelectedDate(new Date())
    }
  }, [(location.state as { goToToday?: number } | null)?.goToToday])

  // Resolve liturgical context whenever selected date changes
  useEffect(() => {
    const ctx = getLiturgicalContext(selectedDate)
    const day = resolveDay(ctx)
    setResolvedDay(day)
    setExpanded(new Set(['gospel']))
    setLoadedVerses({})
    setLoadingVerses(new Set())
  }, [selectedDate])

  // Auto-load gospel verses when day resolves
  useEffect(() => {
    if (!resolvedDay?.readings?.gospel) return
    fetchVerses('gospel', resolvedDay.readings.gospel)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedDay])

  async function fetchVerses(key: ReadingKey, ref: string) {
    if (loadedVerses[key] !== undefined || loadingVerses.has(key)) return
    setLoadingVerses(prev => new Set([...prev, key]))

    try {
      const parsed = parseBibleRef(ref)
      if (parsed.length === 0) return

      let result: BibleVerse[] = []

      // Fetch all segments (handles multi-chapter references)
      for (const segment of parsed) {
        const { book, chapter, verses: targetVerses } = segment
        const chapterData = await api.getBibleChapter(book, chapter)

        if (targetVerses.length > 0) {
          const filtered = chapterData.verses.filter(v => targetVerses.includes(v.number))
          result = [...result, ...filtered]
        } else {
          // Empty verses array means "all verses"
          result = [...result, ...chapterData.verses]
        }
      }

      setLoadedVerses(prev => ({ ...prev, [key]: result }))
    } catch {
      setLoadedVerses(prev => ({ ...prev, [key]: [] }))
    } finally {
      setLoadingVerses(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }

  function handleExpand(key: ReadingKey, ref: string) {
    const next = new Set(expanded)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
      fetchVerses(key, ref)
    }
    setExpanded(next)
  }

  const readings = resolvedDay?.readings
  const gospelRef = readings?.gospel ?? ''
  const gospelText = loadedVerses.gospel?.map(v => v.text).join(' ') ?? ''
  const gospelVerses = loadedVerses.gospel ?? []
  const gospelFitsInImage = canGospelFitInImage(gospelVerses)

  const accentClass = resolvedDay
    ? (COLOR_STYLES[resolvedDay.color]?.text ?? 'text-dorado')
    : 'text-dorado'

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="cross" size={18} />}
        title="Lecturas del Día"
        subtitle={resolvedDay?.label ?? ''}
      />

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Day navigator */}
        <DayNavigator
          selectedDate={selectedDate}
          today={today}
          onSelect={setSelectedDate}
        />

        {resolvedDay && (
          <div className="px-4 space-y-3 animate-fade-in">

            {/* Celebration banner */}
            <CelebrationBanner day={resolvedDay} date={selectedDate} />

            {/* No data placeholder */}
            {!resolvedDay.hasData && (
              <div className="card text-center py-6">
                <span className="text-3xl">📖</span>
                <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium mt-3">
                  {resolvedDay.celebrationName}
                </p>
                <p className="text-xs text-cafe-light dark:text-crema-300 mt-2 max-w-xs mx-auto">
                  Las lecturas de este día aún no están disponibles offline.
                  Las sumamos en próximas actualizaciones.
                </p>
              </div>
            )}

            {/* Readings */}
            {readings && (
              <>
                {readings.first && (
                  <ReadingCard
                    label="Primera Lectura"
                    reference={readings.first}
                    verses={loadedVerses.first}
                    loading={loadingVerses.has('first')}
                    expanded={expanded.has('first')}
                    onExpand={() => handleExpand('first', readings.first!)}
                    accentColor={accentClass}
                  />
                )}

                {readings.psalm && (
                  <ReadingCard
                    label="Salmo Responsorial"
                    reference={readings.psalm}
                    verses={loadedVerses.psalm}
                    loading={loadingVerses.has('psalm')}
                    expanded={expanded.has('psalm')}
                    onExpand={() => handleExpand('psalm', readings.psalm)}
                    accentColor={accentClass}
                  />
                )}

                {readings.second && (
                  <ReadingCard
                    label="Segunda Lectura"
                    reference={readings.second}
                    verses={loadedVerses.second}
                    loading={loadingVerses.has('second')}
                    expanded={expanded.has('second')}
                    onExpand={() => handleExpand('second', readings.second!)}
                    accentColor={accentClass}
                  />
                )}

                {readings.gospel && (
                  <ReadingCard
                    label="Evangelio"
                    reference={readings.gospel}
                    verses={loadedVerses.gospel}
                    loading={loadingVerses.has('gospel')}
                    expanded={expanded.has('gospel')}
                    onExpand={() => handleExpand('gospel', readings.gospel)}
                    accentColor={accentClass}
                  />
                )}
              </>
            )}

            {/* Action buttons */}
            {readings && (
              <div className="space-y-2 pt-1">
                {/* Lectio Divina del Evangelio */}
                <button
                  onClick={() => setShowLectio(true)}
                  disabled={!readings.gospel || !loadedVerses.gospel}
                  className="w-full flex items-center gap-3 bg-dorado text-crema-50
                             rounded-2xl px-5 py-4 font-semibold
                             active:scale-[0.98] transition-all duration-150 disabled:opacity-50
                             shadow-sm hover:bg-dorado-dark"
                >
                  <span className="text-xl">🕯️</span>
                  <div className="text-left">
                    <p className="text-sm font-semibold leading-tight">Lectio Divina del Evangelio</p>
                    {readings.gospel && (
                      <p className="text-xs text-crema-50/70 mt-0.5 font-normal">{formatRef(readings.gospel)}</p>
                    )}
                  </div>
                </button>

                {/* Share button */}
                <div>
                  <button
                    onClick={() => setShowShare(true)}
                    disabled={!gospelFitsInImage || !loadedVerses.gospel}
                    className="w-full flex items-center justify-center gap-2.5
                               border border-crema-300 dark:border-oscuro-border
                               text-cafe-light dark:text-crema-300
                               rounded-2xl px-5 py-3.5 font-medium text-sm
                               active:scale-[0.98] transition-all duration-150
                               hover:bg-crema-100 dark:hover:bg-oscuro-surface
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Icon name="share" size={18} />
                    Generar imagen para compartir
                  </button>
                  {loadedVerses.gospel && !gospelFitsInImage && (
                    <p className="text-xs text-cafe-light dark:text-crema-300 text-center mt-2 opacity-70">
                      El texto es demasiado largo como para que quepa en una imagen :)
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        )}

        <BugReportLink />

      </div>

      {/* Lectio Modal */}
      {showLectio && readings?.gospel && loadedVerses.gospel && (
        <LectioDivinaModal
          gospelRef={readings.gospel}
          verses={loadedVerses.gospel}
          onClose={() => setShowLectio(false)}
        />
      )}

      {/* Share Modal */}
      {showShare && resolvedDay && (
        <ShareModal
          day={resolvedDay}
          date={selectedDate}
          gospelRef={gospelRef}
          gospelText={gospelText}
          gospelVerses={loadedVerses.gospel ?? []}
          onClose={() => setShowShare(false)}
        />
      )}
    </div>
  )
}
