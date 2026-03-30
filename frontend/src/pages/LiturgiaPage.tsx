import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Icon from '../components/Icon'
import { api, BibleVerse, LectioBiblicaResponse, BibleChapter } from '../services/api'
import { downloadLectioPDF } from '../lib/lectio-pdf'
import { getLiturgicalContext, addDays, isSameDay } from '../lib/liturgicalCalendar'
import { resolveDay, ResolvedDay, COLOR_STYLES } from '../lib/lectionaryResolver'
import { parseBibleRef, formatRef, getBookName } from '../lib/bibleRefParser'
import { BugReportLink } from '../components/BugReportButton'
import ImageEditorModal, { type ImageEditorData } from '../components/ImageEditorModal'
import { LITURGICAL_THEME_MAP } from '../lib/verseImage'
import CalendarPicker from '../components/CalendarPicker'

// ── Types ─────────────────────────────────────────────────────────────────────

type ReadingKey = 'first' | 'second' | 'psalm' | 'gospel'
// null = error al cargar (capítulo no disponible), undefined = aún no cargado, [] = cargado vacío
type LoadedVerses = Partial<Record<ReadingKey, BibleVerse[] | null>>

// ── Helper: format date for display ─────────────────────────────────────────

function formatDateLabel(date: Date): string {
  return date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function formatDateNoYear(date: Date): string {
  const str = date.toLocaleDateString('es-AR', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
  return str.charAt(0).toUpperCase() + str.slice(1)
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
  const [showCalendar, setShowCalendar] = useState(false)
  const isToday = isSameDay(selectedDate, today)

  function goDay(delta: number) {
    onSelect(addDays(selectedDate, delta))
    setShowCalendar(false)
  }

  function handleSelectFromCalendar(date: Date) {
    onSelect(date)
    setShowCalendar(false)
  }

  function goToToday() {
    onSelect(today)
    setShowCalendar(false)
  }

  return (
    <div className="py-3">
      {/* Main row: prev arrow | date label | next arrow */}
      <div className="flex items-center gap-2 px-4">
        <button
          onClick={() => goDay(-1)}
          className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center
                     bg-crema-100 dark:bg-oscuro-surface active:scale-90 transition-transform"
          aria-label="Día anterior"
        >
          <Icon name="chevron-left" size={20} className="text-cafe-dark dark:text-crema-200" />
        </button>

        <button
          onClick={() => setShowCalendar(v => !v)}
          className={`flex-1 py-2.5 px-4 rounded-2xl text-center transition-all active:scale-[0.98]
                      ${showCalendar
                        ? 'bg-dorado shadow-sm'
                        : 'bg-dorado/10 border border-dorado/30'
                      }`}
        >
          <span className={`text-base font-semibold leading-tight
                            ${showCalendar ? 'text-crema-50' : 'text-cafe-dark dark:text-crema-200'}`}>
            {formatDateNoYear(selectedDate)}
          </span>
        </button>

        <button
          onClick={() => goDay(1)}
          className="w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center
                     bg-crema-100 dark:bg-oscuro-surface active:scale-90 transition-transform"
          aria-label="Día siguiente"
        >
          <Icon name="chevron-right" size={20} className="text-cafe-dark dark:text-crema-200" />
        </button>
      </div>

      {/* "Volver a hoy" pill — solo visible cuando no es hoy */}
      {!isToday && (
        <div className="flex justify-center mt-2">
          <button
            onClick={goToToday}
            className="flex items-center gap-1.5 text-xs text-dorado font-semibold
                       bg-dorado/10 border border-dorado/30 rounded-full px-3 py-1.5
                       active:scale-95 transition-all"
          >
            <Icon name="refresh" size={13} />
            Volver a hoy
          </button>
        </div>
      )}

      {/* Calendario inline */}
      {showCalendar && (
        <div className="mt-3 px-4">
          <CalendarPicker
            inline
            selectedDate={selectedDate}
            today={today}
            onSelect={handleSelectFromCalendar}
            onClose={() => setShowCalendar(false)}
          />
        </div>
      )}
    </div>
  )
}

// ── Other Readings Banner (collapsible) ──────────────────────────────────────

function OtherReadingsBanner({
  readings,
  loadedVerses,
  loadingVerses,
  expanded,
  onToggleReading,
  open,
  onToggleOpen,
  accentColor,
}: {
  readings: NonNullable<ResolvedDay['readings']>
  loadedVerses: LoadedVerses
  loadingVerses: Set<ReadingKey>
  expanded: Set<ReadingKey>
  onToggleReading: (key: ReadingKey, ref: string) => void
  open: boolean
  onToggleOpen: () => void
  accentColor: string
}) {
  const parts: string[] = []
  if (readings.first) parts.push('Primera Lectura')
  if (readings.second) parts.push('Segunda Lectura')
  if (readings.psalm) parts.push('Salmo')
  if (parts.length === 0) return null

  const label = parts.length === 1
    ? `Ver ${parts[0]}`
    : `Ver ${parts.slice(0, -1).join(', ')} y ${parts[parts.length - 1]}`

  return (
    <div className="rounded-2xl border border-crema-200 dark:border-oscuro-border
                    bg-white dark:bg-oscuro-surface overflow-hidden">
      {/* Toggle header */}
      <button
        onClick={onToggleOpen}
        className="w-full flex items-center justify-between px-4 py-3
                   active:bg-crema-50 dark:active:bg-oscuro-bg transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm">📖</span>
          <span className="text-xs font-medium text-cafe-dark dark:text-crema-200">{label}</span>
        </div>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-transform duration-200
                         bg-crema-100 dark:bg-oscuro-bg ${open ? 'rotate-180' : ''}`}>
          <Icon name="chevron-down" size={15} className="text-cafe-light dark:text-crema-300" />
        </div>
      </button>

      {/* Expanded readings */}
      {open && (
        <div className="px-4 pb-4 pt-1 space-y-3 border-t border-crema-100 dark:border-oscuro-border animate-fade-in">
          {readings.first && (
            <ReadingCard
              label="Primera Lectura"
              reference={readings.first}
              verses={loadedVerses.first}
              loading={loadingVerses.has('first')}
              expanded={expanded.has('first')}
              onExpand={() => onToggleReading('first', readings.first!)}
              accentColor={accentColor}
            />
          )}
          {readings.psalm && (
            <ReadingCard
              label="Salmo Responsorial"
              reference={readings.psalm}
              verses={loadedVerses.psalm}
              loading={loadingVerses.has('psalm')}
              expanded={expanded.has('psalm')}
              onExpand={() => onToggleReading('psalm', readings.psalm)}
              accentColor={accentColor}
            />
          )}
          {readings.second && (
            <ReadingCard
              label="Segunda Lectura"
              reference={readings.second}
              verses={loadedVerses.second}
              loading={loadingVerses.has('second')}
              expanded={expanded.has('second')}
              onExpand={() => onToggleReading('second', readings.second!)}
              accentColor={accentColor}
            />
          )}
        </div>
      )}
    </div>
  )
}

// ── Gospel Card (prominent, always visible) ───────────────────────────────────

function GospelCard({
  reference,
  verses,
  loading,
  resolvedDay,
}: {
  reference: string
  verses: BibleVerse[] | null | undefined
  loading: boolean
  resolvedDay: ResolvedDay
}) {
  const refs = parseBibleRef(reference)
  const bookName = refs.length > 0 ? getBookName(refs[0].book) : ''
  const refDisplay = formatRef(reference)
  const styles = COLOR_STYLES[resolvedDay.color] ?? COLOR_STYLES.green

  // Strip book abbreviation from refDisplay to get just "8:1-11"
  const abbr = refs.length > 0 ? refs[0].book : ''
  const verseRange = refDisplay.startsWith(abbr)
    ? refDisplay.slice(abbr.length).trim()
    : refDisplay

  return (
    <div className="card overflow-hidden">
      {/* Header con color litúrgico */}
      <div className={`rounded-xl p-4 mb-5 ${styles.bg} ${styles.border} border`}>
        <p className={`text-xs font-medium mb-2 ${styles.text} opacity-65`}>
          {resolvedDay.celebrationName}
        </p>
        <p className={`font-serif leading-snug ${styles.text}`}>
          <span className="text-xl font-semibold">Evangelio según San {bookName}</span>
          <span className="text-sm font-medium opacity-75"> {verseRange}</span>
        </p>
      </div>

      {/* Versículos */}
      {loading ? (
        <div className="flex flex-col items-center py-10 gap-3 animate-pulse-soft">
          <span className="text-4xl">📖</span>
          <p className="text-sm text-cafe-light dark:text-crema-300">Cargando evangelio...</p>
        </div>
      ) : verses && verses.length > 0 ? (
        <div className="space-y-1.5">
          {verses.map((v) => (
            <p key={v.number} className="font-serif text-[17px] text-cafe-dark dark:text-crema-200 leading-snug">
              <span className="text-dorado font-bold text-xs mr-2 align-top leading-6 select-none">
                {v.number}
              </span>
              {v.text}
            </p>
          ))}
        </div>
      ) : verses === null ? (
        <div className="py-4 space-y-2 text-center">
          <p className="text-sm font-medium text-cafe-dark dark:text-crema-200">
            Texto no disponible offline
          </p>
          <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed max-w-xs mx-auto">
            Este pasaje aún no está en la base de datos local. Buscalo en tu Biblia con la referencia:
          </p>
          <p className="text-sm font-semibold text-dorado">{refDisplay}</p>
        </div>
      ) : (
        <p className="text-sm text-cafe-light dark:text-crema-300 text-center py-6">
          No se encontraron versículos para <span className="font-medium">{refDisplay}</span>
        </p>
      )}
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
  verses: BibleVerse[] | null | undefined
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
          ) : verses === null ? (
            <div className="py-3 space-y-1">
              <p className="text-sm text-cafe-dark dark:text-crema-200 font-medium">
                Texto no disponible offline
              </p>
              <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                Este pasaje aún no está en la base de datos local. Podés buscarlo en tu Biblia con la referencia:
              </p>
              <p className="text-xs font-semibold text-dorado mt-1">{refDisplay}</p>
            </div>
          ) : (
            <p className="text-sm text-cafe-light dark:text-crema-300 text-center py-4">
              No se encontraron versículos para <span className="font-medium">{refDisplay}</span>
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


// ── Main Page ─────────────────────────────────────────────────────────────────

export default function LiturgiaPage() {
  const today = useRef(new Date()).current
  const location = useLocation()
  const [selectedDate, setSelectedDate] = useState<Date>(today)
  const [resolvedDay, setResolvedDay] = useState<ResolvedDay | null>(null)
  const [expanded, setExpanded] = useState<Set<ReadingKey>>(new Set())
  const [showOtherReadings, setShowOtherReadings] = useState(false)
  const [loadedVerses, setLoadedVerses] = useState<LoadedVerses>({})
  const [loadingVerses, setLoadingVerses] = useState<Set<ReadingKey>>(new Set())
  const [showLectio, setShowLectio] = useState(false)
  const [imageEditorData, setImageEditorData] = useState<ImageEditorData | null>(null)
  const [shareTextCopied, setShareTextCopied] = useState(false)

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
    setExpanded(new Set())
    setShowOtherReadings(false)
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
      setLoadedVerses(prev => ({ ...prev, [key]: null }))
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

  async function handleShareText() {
    const verses = loadedVerses.gospel
    if (!verses || !gospelRef) return
    const refs = parseBibleRef(gospelRef)
    const bookName = refs.length > 0 ? getBookName(refs[0].book) : ''
    const refDisplay = formatRef(gospelRef)
    const abbr = refs.length > 0 ? refs[0].book : ''
    const verseRange = refDisplay.startsWith(abbr) ? refDisplay.slice(abbr.length).trim() : refDisplay
    const versesText = verses.map(v => `${v.number} ${v.text}`).join('\n')
    const text = `Evangelio según San ${bookName} ${verseRange}\n\n${versesText}\n\nwww.mana-app.org`

    if (navigator.share) {
      try { await navigator.share({ text }) } catch { /* cancelled */ }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        setShareTextCopied(true)
        setTimeout(() => setShareTextCopied(false), 2500)
      } catch { /* clipboard not available */ }
    }
  }

  const accentClass = resolvedDay
    ? (COLOR_STYLES[resolvedDay.color]?.text ?? 'text-dorado')
    : 'text-dorado'

  return (
    <div className="flex flex-col h-screen">
      <header className="sticky top-0 z-10 bg-crema/95 dark:bg-oscuro-bg/95 backdrop-blur-sm
                          border-b border-crema-200 dark:border-oscuro-border px-5 py-4
                          lg:static lg:z-auto lg:bg-transparent lg:dark:bg-transparent lg:backdrop-blur-none">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-5xl font-semibold text-cafe-dark dark:text-crema-200 leading-none lg:text-3xl">
            Maná
          </h1>
          <div className="w-px h-8 bg-crema-300 dark:bg-oscuro-border" />
          <div>
            <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200 leading-tight">Evangelio del día</p>
            {resolvedDay?.label && (
              <p className="text-xs text-cafe-light dark:text-crema-300">{resolvedDay.label}</p>
            )}
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Day navigator */}
        <DayNavigator
          selectedDate={selectedDate}
          today={today}
          onSelect={setSelectedDate}
        />

        {resolvedDay && (
          <div className="px-4 space-y-3 animate-fade-in">

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

            {readings && (
              <>
                {/* Banner colapsable: demás lecturas */}
                {(readings.first || readings.psalm || readings.second) && (
                  <OtherReadingsBanner
                    readings={readings}
                    loadedVerses={loadedVerses}
                    loadingVerses={loadingVerses}
                    expanded={expanded}
                    onToggleReading={handleExpand}
                    open={showOtherReadings}
                    onToggleOpen={() => setShowOtherReadings(v => !v)}
                    accentColor={accentClass}
                  />
                )}

                {/* Evangelio prominente */}
                {readings.gospel && (
                  <GospelCard
                    reference={readings.gospel}
                    verses={loadedVerses.gospel}
                    loading={loadingVerses.has('gospel')}
                    resolvedDay={resolvedDay}
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

                {/* Share as text */}
                <button
                  onClick={handleShareText}
                  disabled={!loadedVerses.gospel}
                  className="w-full flex items-center justify-center gap-2.5
                             border border-crema-300 dark:border-oscuro-border
                             text-cafe-light dark:text-crema-300
                             rounded-2xl px-5 py-3.5 font-medium text-sm
                             active:scale-[0.98] transition-all duration-150
                             hover:bg-crema-100 dark:hover:bg-oscuro-surface
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon name={shareTextCopied ? 'check' : 'share'} size={18} />
                  {shareTextCopied ? '¡Copiado al portapapeles!' : 'Compartir como texto'}
                </button>

                {/* Share button → opens image editor */}
                <button
                  onClick={() => {
                    if (!resolvedDay || !loadedVerses.gospel) return
                    setImageEditorData({
                      headerLabel: 'EVANGELIO',
                      verseRef: formatRef(gospelRef),
                      verses: loadedVerses.gospel,
                      footer: formatDateLabel(selectedDate),
                      defaultThemeId: LITURGICAL_THEME_MAP[resolvedDay.color] ?? 'dorado',
                    })
                  }}
                  disabled={!loadedVerses.gospel}
                  className="w-full flex items-center justify-center gap-2.5
                             border border-crema-300 dark:border-oscuro-border
                             text-cafe-light dark:text-crema-300
                             rounded-2xl px-5 py-3.5 font-medium text-sm
                             active:scale-[0.98] transition-all duration-150
                             hover:bg-crema-100 dark:hover:bg-oscuro-surface
                             disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Icon name="image" size={18} />
                  Crear imagen para compartir
                </button>
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

      {/* Image Editor Modal */}
      {imageEditorData && (
        <ImageEditorModal
          data={imageEditorData}
          onClose={() => setImageEditorData(null)}
        />
      )}

    </div>
  )
}
