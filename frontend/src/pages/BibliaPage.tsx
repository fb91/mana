import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api, BibleBook, BibleChapter, LectioBiblicaResponse } from '../services/api'
import { downloadLectioPDF } from '../lib/lectio-pdf'
import { useAppStore } from '../store/useAppStore'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

// All books show their abbreviation as decorative background text

// ── Long-press hook ───────────────────────────────────────────────────────────
function useLongPress(callback: () => void, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function start() {
    timer.current = setTimeout(callback, delay)
  }

  function cancel() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  return {
    onTouchStart: start,
    onTouchEnd: cancel,
    onTouchMove: cancel,
    onMouseDown: start,
    onMouseUp: cancel,
    onMouseLeave: cancel,
  }
}

// ── Book card ─────────────────────────────────────────────────────────────────
function BookCard({
  book,
  pinned,
  highlighted,
  cardRef,
  onSelect,
  onLongPress,
}: {
  book: BibleBook
  pinned: boolean
  highlighted: boolean
  cardRef?: React.RefObject<HTMLButtonElement>
  onSelect: () => void
  onLongPress: () => void
}) {
  const longPress = useLongPress(onLongPress)

  return (
    <button
      ref={cardRef}
      {...longPress}
      onClick={onSelect}
      className={[
        'relative bg-white dark:bg-oscuro-surface border rounded-2xl shadow-sm text-left py-3 px-4 overflow-hidden',
        'hover:border-dorado/60 hover:shadow-md active:scale-95 transition-all duration-300 group',
        highlighted
          ? 'border-dorado shadow-md shadow-dorado/20 ring-2 ring-dorado/40'
          : 'border-crema-200 dark:border-oscuro-border',
      ].join(' ')}
    >
      {/* Abbreviation background (decorative) */}
      <span
        aria-hidden
        className="absolute right-1 top-1/2 -translate-y-1/2 select-none pointer-events-none
                   font-serif italic text-[54px] leading-none text-dorado opacity-[0.13]
                   dark:opacity-[0.16]"
      >
        {book.abbr}
      </span>

      {/* Pin corner triangle — top-left, clipped by the card's overflow-hidden */}
      {pinned && (
        <span
          aria-hidden
          className="absolute top-0 left-0 w-9 h-9 pointer-events-none"
          style={{
            background: 'rgb(var(--accent))',
            clipPath: 'polygon(0 0, 100% 0, 0 100%)',
            opacity: 0.75,
          }}
        />
      )}

      <p className="text-sm font-medium text-cafe-dark dark:text-crema-200
                    group-hover:text-dorado transition-colors leading-tight relative z-10">
        {book.name}
      </p>
      <p className="text-xs text-cafe-light dark:text-crema-300 mt-0.5 relative z-10">
        {book.chaptersCount} cap.
      </p>
    </button>
  )
}

// ── Long-press popup ──────────────────────────────────────────────────────────
function LongPressPopup({
  book,
  pinned,
  onPin,
  onClose,
}: {
  book: BibleBook
  pinned: boolean
  onPin: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full bg-crema dark:bg-oscuro-bg rounded-t-3xl px-5 py-6 pb-10 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />
        <p className="font-serif text-lg font-semibold text-cafe-dark dark:text-crema-200 mb-1">
          {book.name}
        </p>
        <p className="text-xs text-cafe-light dark:text-crema-300 mb-5">
          {book.chaptersCount} capítulos
        </p>
        <button
          onClick={() => { onPin(); onClose() }}
          className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl
                     bg-dorado/10 hover:bg-dorado/20 active:scale-[0.98] transition-all"
        >
          <Icon name="pin" size={20} className={pinned ? 'text-red-400' : 'text-dorado'} />
          <span className={`font-medium text-sm ${pinned ? 'text-red-500' : 'text-dorado'}`}>
            {pinned ? 'Quitar de fijados' : 'Fijar este libro'}
          </span>
        </button>
      </div>
    </div>
  )
}

// ── Book Selector ─────────────────────────────────────────────────────────────
function BookSelector({
  books,
  pinnedBooks,
  newlyPinned,
  onSelect,
  onLongPress,
}: {
  books: BibleBook[]
  pinnedBooks: string[]
  newlyPinned: string | null
  onSelect: (abbr: string) => void
  onLongPress: (book: BibleBook) => void
}) {
  const pinnedCardRef = useRef<HTMLButtonElement>(null)
  const pinned = books.filter(b => pinnedBooks.includes(b.abbr))
  const at = books.filter(b => b.testament === 'AT')
  const nt = books.filter(b => b.testament === 'NT')

  // Scroll to newly pinned book and highlight it briefly
  useEffect(() => {
    if (newlyPinned) {
      setTimeout(() => {
        pinnedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
    }
  }, [newlyPinned])

  return (
    <div className="pb-6 animate-fade-in">
      {/* Fijados section */}
      {pinned.length > 0 && (
        <div className="mb-6 px-4">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="pin" size={14} className="text-dorado" />
            <h2 className="font-serif text-xs font-semibold text-dorado uppercase tracking-widest">
              Fijados
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {pinned.map(book => (
              <BookCard
                key={book.abbr}
                book={book}
                pinned={true}
                highlighted={newlyPinned === book.abbr}
                cardRef={newlyPinned === book.abbr ? pinnedCardRef : undefined}
                onSelect={() => onSelect(book.abbr)}
                onLongPress={() => onLongPress(book)}
              />
            ))}
          </div>
        </div>
      )}

      <TestamentSection
        title="Antiguo Testamento"
        books={at}
        pinnedBooks={pinnedBooks}
        newlyPinned={newlyPinned}
        onSelect={onSelect}
        onLongPress={onLongPress}
      />
      <TestamentSection
        title="Nuevo Testamento"
        books={nt}
        pinnedBooks={pinnedBooks}
        newlyPinned={newlyPinned}
        onSelect={onSelect}
        onLongPress={onLongPress}
      />
    </div>
  )
}

function TestamentSection({
  title,
  books,
  pinnedBooks,
  newlyPinned,
  onSelect,
  onLongPress,
}: {
  title: string
  books: BibleBook[]
  pinnedBooks: string[]
  newlyPinned: string | null
  onSelect: (abbr: string) => void
  onLongPress: (book: BibleBook) => void
}) {
  if (books.length === 0) return null
  return (
    <div className="mb-6 px-4">
      <h2 className="font-serif text-xs font-semibold text-dorado uppercase tracking-widest mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {books.map(book => (
          <BookCard
            key={book.abbr}
            book={book}
            pinned={pinnedBooks.includes(book.abbr)}
            highlighted={false}
            onSelect={() => onSelect(book.abbr)}
            onLongPress={() => onLongPress(book)}
          />
        ))}
      </div>
    </div>
  )
}

// ── Chapter Selector ──────────────────────────────────────────────────────────
function ChapterSelector({
  book,
  onSelect,
  onBack,
}: {
  book: BibleBook
  onSelect: (chapter: number) => void
  onBack: () => void
}) {
  return (
    <div className="px-4 pb-6 animate-fade-in">
      <div className="flex items-center gap-2 mb-5">
        <button
          onClick={onBack}
          className="text-dorado hover:text-dorado-dark text-sm font-medium transition-colors py-1"
        >
          ← Libros
        </button>
        <span className="text-cafe-light dark:text-crema-300 text-sm">/</span>
        <span className="font-serif text-sm font-semibold text-cafe-dark dark:text-crema-200">
          {book.name}
        </span>
      </div>
      <div className="grid grid-cols-5 gap-2">
        {Array.from({ length: book.chaptersCount }, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => onSelect(n)}
            className="aspect-square flex items-center justify-center rounded-xl
                       bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                       text-cafe-dark dark:text-crema-200 font-medium text-sm
                       hover:bg-dorado hover:text-crema-50 hover:border-dorado
                       active:scale-95 transition-all duration-150"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── PDF Download Button ───────────────────────────────────────────────────────
function DownloadPDFButton({ onClick }: { onClick: () => void }) {
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
function LectioModal({
  chapter,
  selectedVerses,
  onClose,
}: {
  chapter: BibleChapter
  selectedVerses: number[]
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<LectioBiblicaResponse | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const textos = selectedVerses.map(n => chapter.verses.find(v => v.number === n)?.text ?? '')
    api.getLectioBiblica(chapter.book, chapter.bookName, chapter.chapter, selectedVerses, textos)
      .then(setResult)
      .catch(() => setError('No se pudo preparar la Lectio. Intentá de nuevo.'))
      .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const versoLabel = selectedVerses.length === 1
    ? `${chapter.bookName} ${chapter.chapter}:${selectedVerses[0]}`
    : `${chapter.bookName} ${chapter.chapter}:${selectedVerses[0]}-${selectedVerses[selectedVerses.length - 1]}`

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
        <p className="text-dorado text-sm font-medium mb-4">{versoLabel}</p>

        <div className="bg-dorado/10 dark:bg-dorado/15 border border-dorado/30 rounded-2xl p-4 mb-6">
          <div className="space-y-2">
            {selectedVerses.map(n => {
              const verse = chapter.verses.find(v => v.number === n)
              if (!verse) return null
              return (
                <p key={n} className="font-serif text-[15px] text-cafe-dark dark:text-crema-200 leading-relaxed">
                  <span className="text-dorado font-bold text-xs mr-2 align-top leading-6 select-none">
                    {verse.number}
                  </span>
                  {verse.text}
                </p>
              )
            })}
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
            <DownloadPDFButton onClick={() => downloadLectioPDF(result, chapter, selectedVerses)} />
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
            <DownloadPDFButton onClick={() => downloadLectioPDF(result, chapter, selectedVerses)} />
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

function LectioSection({ titulo, color, children }: { titulo: string; color: 'dorado' | 'cafe'; children: React.ReactNode }) {
  const border = color === 'dorado' ? 'border-dorado/40' : 'border-cafe-light/40'
  return (
    <div className={`border-l-2 ${border} pl-4`}>
      <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wider mb-2">{titulo}</p>
      {children}
    </div>
  )
}

// ── Verse Reader ──────────────────────────────────────────────────────────────
type SlideDir = 'next' | 'prev' | null

function VerseReader({
  chapter,
  maxChapter,
  highlightVerse,
  focusMode,
  setFocusMode,
  onBack,
  onChapterChange,
  scrollContainerRef,
}: {
  chapter: BibleChapter
  maxChapter: number
  highlightVerse: number | null
  focusMode: boolean
  setFocusMode: (v: boolean) => void
  onBack: () => void
  onChapterChange: (delta: number) => void
  scrollContainerRef: React.RefObject<HTMLDivElement>
}) {
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const prevChapterRef = useRef(chapter.chapter)
  const [activeHighlight, setActiveHighlight] = useState<number | null>(highlightVerse)
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [showLectio, setShowLectio] = useState(false)
  const [showFocusExit, setShowFocusExit] = useState(false)
  const [slideDir, setSlideDir] = useState<SlideDir>(null)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => { setSelectedVerses(new Set()) }, [chapter.chapter])

  // Trigger slide-in when chapter data actually changes (component stays mounted)
  useEffect(() => {
    if (prevChapterRef.current !== chapter.chapter) {
      prevChapterRef.current = chapter.chapter
      setSlideDir(null)
      setAnimKey(k => k + 1)
    }
  }, [chapter.chapter])

  useEffect(() => {
    if (highlightVerse) {
      setActiveHighlight(highlightVerse)
      setTimeout(() => {
        verseRefs.current[highlightVerse]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
      const timer = setTimeout(() => setActiveHighlight(null), 3500)
      return () => clearTimeout(timer)
    }
  }, [highlightVerse, chapter.chapter])

  function toggleVerse(n: number, e: React.MouseEvent) {
    if (focusMode) {
      // Stop bubbling so the wrapper's onClick doesn't double-toggle
      e.stopPropagation()
      setShowFocusExit(v => !v)
      return
    }
    setSelectedVerses(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  function navigate(delta: number) {
    const next = chapter.chapter + delta
    if (next < 1 || next > maxChapter) return
    if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0
    setSlideDir(delta > 0 ? 'next' : 'prev')
    setAnimKey(k => k + 1)
    setTimeout(() => {
      onChapterChange(delta)
    }, 220)
  }

  function enterFocusMode() {
    setFocusMode(true)
    setShowFocusExit(false)
    setSelectedVerses(new Set())
  }

  function exitFocusMode() {
    setFocusMode(false)
    setShowFocusExit(false)
  }

  function toggleFocusExit(e: React.MouseEvent) {
    // Only trigger when clicking directly on the wrapper, not on children (verses, buttons)
    if (e.target === e.currentTarget) setShowFocusExit(v => !v)
  }

  const sortedSelected = Array.from(selectedVerses).sort((a, b) => a - b)

  const slideClass = slideDir === 'next'
    ? 'animate-slide-out-left'
    : slideDir === 'prev'
      ? 'animate-slide-out-right'
      : 'animate-slide-in'

  const versesContent = (
    <div key={animKey} className={`px-3 space-y-0.5 ${slideClass}`}>
      {chapter.verses.map(verse => {
        const isSelected = selectedVerses.has(verse.number)
        const isHighlighted = activeHighlight === verse.number
        return (
          <div
            key={verse.number}
            ref={el => { verseRefs.current[verse.number] = el }}
            onClick={(e) => toggleVerse(verse.number, e)}
            className={`rounded-xl px-3 py-2.5 cursor-pointer select-none transition-all duration-200 ${
              isSelected
                ? 'bg-dorado/20 dark:bg-dorado/25 ring-1 ring-dorado/50'
                : isHighlighted
                  ? 'bg-dorado/25 dark:bg-dorado/30 ring-1 ring-dorado/60'
                  : focusMode
                    ? ''
                    : 'hover:bg-crema-100 dark:hover:bg-oscuro-surface active:bg-crema-200 dark:active:bg-oscuro-border'
            }`}
          >
            {isSelected && <span className="text-dorado text-xs mr-1 select-none">✓</span>}
            <span className={`font-bold text-xs mr-2 select-none align-top leading-6 ${isSelected ? 'text-dorado' : 'text-dorado/70'}`}>
              {verse.number}
            </span>
            <span className="text-cafe-dark dark:text-crema-200 text-base leading-relaxed">
              {verse.text}
            </span>
          </div>
        )
      })}

      {/* Bottom chapter nav (feature 4) */}
      <div className="flex items-center justify-between pt-6 pb-2 px-1">
        <button
          onClick={() => navigate(-1)}
          disabled={chapter.chapter <= 1}
          className="flex items-center gap-1.5 text-sm font-medium text-dorado
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:text-dorado-dark active:scale-95 transition-all py-2 px-3
                     rounded-xl hover:bg-dorado/10"
        >
          <Icon name="chevron-left" size={16} />
          Anterior
        </button>
        <span className="text-xs text-cafe-light dark:text-crema-400">
          {chapter.chapter} / {maxChapter}
        </span>
        <button
          onClick={() => navigate(1)}
          disabled={chapter.chapter >= maxChapter}
          className="flex items-center gap-1.5 text-sm font-medium text-dorado
                     disabled:opacity-30 disabled:cursor-not-allowed
                     hover:text-dorado-dark active:scale-95 transition-all py-2 px-3
                     rounded-xl hover:bg-dorado/10"
        >
          Siguiente
          <Icon name="chevron-right" size={16} />
        </button>
      </div>
    </div>
  )

  // ── Focus mode overlay (feature 3) ─────────────────────────────────────────
  if (focusMode) {
    return (
      <div className="fixed inset-0 z-[90] bg-crema dark:bg-oscuro-bg overflow-y-auto">
        <div className="py-8 pb-32" onClick={toggleFocusExit}>
          {versesContent}
        </div>

        {/* Exit button: appears on tap */}
        {showFocusExit && (
          <div className="fixed bottom-8 left-0 right-0 flex justify-center z-[100] animate-slide-up px-6">
            <button
              onClick={exitFocusMode}
              className="flex items-center gap-2 bg-cafe-dark/90 dark:bg-crema-200/90
                         text-crema-50 dark:text-cafe-dark font-semibold text-sm
                         rounded-2xl px-6 py-3.5 shadow-xl backdrop-blur-sm
                         active:scale-95 transition-all"
            >
              <Icon name="eye" size={16} />
              Salir del modo lectura
            </button>
          </div>
        )}
      </div>
    )
  }

  // ── Normal mode ─────────────────────────────────────────────────────────────
  return (
    <div className="animate-fade-in pb-4">
      {/* Nav bar */}
      <div className="flex items-center justify-between px-4 mb-3">
        <button
          onClick={onBack}
          className="text-dorado hover:text-dorado-dark text-sm font-medium transition-colors py-1"
        >
          ← Capítulos
        </button>
        <span className="font-serif text-sm font-semibold text-cafe-dark dark:text-crema-200">
          {chapter.bookName} {chapter.chapter}
        </span>
        <div className="flex gap-3 items-center">
          {/* Focus mode button (feature 3) */}
          <button
            onClick={enterFocusMode}
            title="Modo sin distracciones"
            className="text-cafe-light dark:text-crema-400 hover:text-dorado transition-colors py-1"
          >
            <Icon name="eye" size={17} />
          </button>
          <button
            onClick={() => navigate(-1)}
            disabled={chapter.chapter <= 1}
            className="text-dorado hover:text-dorado-dark text-sm transition-colors disabled:opacity-30 py-1"
          >
            ‹ ant.
          </button>
          <button
            onClick={() => navigate(1)}
            disabled={chapter.chapter >= maxChapter}
            className="text-dorado hover:text-dorado-dark text-sm transition-colors disabled:opacity-30 py-1"
          >
            sig. ›
          </button>
        </div>
      </div>

      {selectedVerses.size === 0 && (
        <p className="text-center text-xs text-cafe-light dark:text-crema-300 mb-3 px-4">
          Tocá versículos para seleccionarlos e iniciar una Lectio Divina
        </p>
      )}

      {versesContent}

      {/* Floating Lectio bar */}
      {selectedVerses.size > 0 && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:max-w-[calc(28rem-2rem)] px-0 z-40 animate-slide-up">
          <div className="flex items-center gap-2 bg-white dark:bg-oscuro-surface
                          border border-crema-200 dark:border-oscuro-border
                          rounded-2xl shadow-lg px-4 py-3">
            <span className="text-xs text-cafe-light dark:text-crema-300 flex-1">
              {selectedVerses.size} versículo{selectedVerses.size > 1 ? 's' : ''} seleccionado{selectedVerses.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowLectio(true)}
              className="flex items-center gap-1.5 bg-dorado text-crema-50
                         rounded-xl px-4 py-2 text-sm font-semibold
                         active:scale-95 transition-all duration-150"
            >
              <span>🕯️</span>
              <span>Lectio Divina</span>
            </button>
          </div>
        </div>
      )}

      {showLectio && (
        <LectioModal
          chapter={chapter}
          selectedVerses={sortedSelected}
          onClose={() => setShowLectio(false)}
        />
      )}
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────
type View = 'books' | 'chapters' | 'reader'

export default function BibliaPage() {
  const { book: urlBook, chapter: urlChapter } = useParams<{ book?: string; chapter?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { pinnedBooks, togglePinnedBook, setLastBiblePath } = useAppStore()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [books, setBooks] = useState<BibleBook[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [booksError, setBooksError] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null)
  const [chapterData, setChapterData] = useState<BibleChapter | null>(null)
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [view, setView] = useState<View>('books')
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null)
  const [longPressBook, setLongPressBook] = useState<BibleBook | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [newlyPinned, setNewlyPinned] = useState<string | null>(null)

  useEffect(() => {
    api.getBibleBooks()
      .then(data => { setBooks(data); setLoadingBooks(false) })
      .catch(() => { setBooksError(true); setLoadingBooks(false) })
  }, [])

  // Handle deep-link via URL params
  useEffect(() => {
    if (!urlBook || !urlChapter || books.length === 0) return
    const book = books.find(b => b.abbr === urlBook)
    if (!book) return
    const chapterNum = parseInt(urlChapter, 10)
    if (isNaN(chapterNum)) return
    const verso = searchParams.get('verso') ? parseInt(searchParams.get('verso')!, 10) : null
    setSelectedBook(book)
    setView('reader')
    setHighlightVerse(verso)
    loadChapter(urlBook, chapterNum)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlBook, urlChapter, books])

  const loadChapter = useCallback(async (book: string, chapter: number) => {
    setLoadingChapter(true)
    const path = `/biblia/${book}/${chapter}`
    try {
      const data = await api.getBibleChapter(book, chapter)
      setChapterData(data)
      setLastBiblePath(path)
    } finally {
      setLoadingChapter(false)
    }
  }, [setLastBiblePath])

  function handleSelectBook(abbr: string) {
    const book = books.find(b => b.abbr === abbr)
    if (!book) return
    setSelectedBook(book)
    setView('chapters')
    navigate('/biblia', { replace: true })
  }

  function handleSelectChapter(chapter: number) {
    if (!selectedBook) return
    setView('reader')
    setHighlightVerse(null)
    navigate(`/biblia/${selectedBook.abbr}/${chapter}`, { replace: true })
    loadChapter(selectedBook.abbr, chapter)
  }

  function handleChapterChange(delta: number) {
    if (!chapterData || !selectedBook) return
    const next = chapterData.chapter + delta
    if (next < 1 || next > selectedBook.chaptersCount) return
    setHighlightVerse(null)
    navigate(`/biblia/${selectedBook.abbr}/${next}`, { replace: true })
    loadChapter(selectedBook.abbr, next)
  }

  const subtitle = view === 'reader' && chapterData
    ? `${chapterData.bookName} ${chapterData.chapter}`
    : view === 'chapters' && selectedBook
      ? selectedBook.name
      : 'Nueva Biblia de Jerusalén'

  return (
    <div className="flex flex-col h-screen">
      <PageHeader icon={<Icon name="book-open" size={18} />} title="Biblia" subtitle={subtitle} />

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pt-4 pb-28">
        {loadingBooks ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 animate-pulse-soft">
            <span className="text-4xl">📖</span>
            <p className="text-sm text-cafe-light dark:text-crema-300">Cargando libros...</p>
          </div>
        ) : booksError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-3 px-6 text-center">
            <span className="text-4xl">⚠️</span>
            <p className="text-sm text-cafe-light dark:text-crema-300">
              No se pudo cargar la Biblia. Verificá tu conexión e intentá de nuevo.
            </p>
          </div>
        ) : view === 'books' ? (
          <BookSelector
            books={books}
            pinnedBooks={pinnedBooks}
            newlyPinned={newlyPinned}
            onSelect={handleSelectBook}
            onLongPress={setLongPressBook}
          />
        ) : view === 'chapters' && selectedBook ? (
          <ChapterSelector
            book={selectedBook}
            onSelect={handleSelectChapter}
            onBack={() => { setView('books'); navigate('/biblia', { replace: true }) }}
          />
        ) : view === 'reader' ? (
          // Show spinner only on initial load (no data yet). When in focus mode or when
          // chapterData already exists, keep VerseReader mounted so focusMode state persists.
          loadingChapter && !chapterData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-pulse-soft">
              <span className="text-4xl">📖</span>
              <p className="text-sm text-cafe-light dark:text-crema-300">Cargando capítulo...</p>
            </div>
          ) : chapterData && selectedBook ? (
            <VerseReader
              chapter={chapterData}
              maxChapter={selectedBook.chaptersCount}
              highlightVerse={highlightVerse}
              focusMode={focusMode}
              setFocusMode={setFocusMode}
              onBack={() => setView('chapters')}
              onChapterChange={handleChapterChange}
              scrollContainerRef={scrollContainerRef}
            />
          ) : null
        ) : null}
      </div>

      {/* Long-press popup (feature 1) */}
      {longPressBook && (
        <LongPressPopup
          book={longPressBook}
          pinned={pinnedBooks.includes(longPressBook.abbr)}
          onPin={() => {
            const willPin = !pinnedBooks.includes(longPressBook.abbr)
            togglePinnedBook(longPressBook.abbr)
            if (willPin) {
              setNewlyPinned(longPressBook.abbr)
              setTimeout(() => setNewlyPinned(null), 2000)
            } else {
              setNewlyPinned(null)
            }
          }}
          onClose={() => setLongPressBook(null)}
        />
      )}
    </div>
  )
}
