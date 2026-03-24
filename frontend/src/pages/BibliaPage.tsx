import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api, BibleBook, BibleChapter, LectioBiblicaResponse } from '../services/api'
import { downloadLectioPDF } from '../lib/lectio-pdf'
import { useAppStore, SavedCitation } from '../store/useAppStore'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { BugReportLink } from '../components/BugReportButton'
import SaveCitationModal from '../components/SaveCitationModal'
import ImageEditorModal, { type ImageEditorData } from '../components/ImageEditorModal'

// ── Citation parser ────────────────────────────────────────────────────────────
interface ParsedCitation {
  book: BibleBook
  chapter: number
  verse?: number
}

function parseCitation(query: string, books: BibleBook[]): ParsedCitation | null {
  const normalized = query.trim().toLowerCase()
  if (!normalized) return null

  // Sort by name length desc so "1 Corintios" matches before "Corintios"
  const sorted = [...books].sort((a, b) => b.name.length - a.name.length)

  for (const book of sorted) {
    const name = book.name.toLowerCase()
    const abbr = book.abbr.toLowerCase()
    let remaining = ''

    if (normalized.startsWith(name)) {
      remaining = normalized.slice(name.length).trim()
    } else if (normalized.startsWith(abbr) &&
               (normalized.length === abbr.length || normalized[abbr.length] === ' ')) {
      remaining = normalized.slice(abbr.length).trim()
    } else {
      continue
    }

    if (!remaining) return null
    const match = remaining.match(/^(\d+)(?:[:.,-](\d+))?/)
    if (!match) return null

    const chapter = parseInt(match[1])
    const verse = match[2] ? parseInt(match[2]) : undefined
    if (chapter < 1 || chapter > book.chaptersCount) return null

    return { book, chapter, verse }
  }
  return null
}

// ── Long-press hook ───────────────────────────────────────────────────────────
function useLongPress(callback: () => void, delay = 500) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)

  function start(e: React.TouchEvent | React.MouseEvent) {
    fired.current = false
    e.preventDefault()
    timer.current = setTimeout(() => {
      fired.current = true
      callback()
    }, delay)
  }

  function cancel() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  return {
    onTouchStart: start,
    onTouchEnd: (e: React.TouchEvent) => {
      cancel()
      if (fired.current) e.preventDefault()
    },
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
      style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      className={[
        'relative bg-white dark:bg-oscuro-surface border rounded-2xl shadow-sm text-left py-3 px-4 overflow-hidden',
        'hover:border-dorado/60 hover:shadow-md active:scale-95 transition-all duration-300 group',
        highlighted
          ? 'border-dorado shadow-md shadow-dorado/20 ring-2 ring-dorado/40'
          : 'border-crema-200 dark:border-oscuro-border',
      ].join(' ')}
    >
      <span
        aria-hidden
        className="absolute right-1 top-1/2 -translate-y-1/2 select-none pointer-events-none
                   font-serif italic text-[54px] leading-none text-dorado opacity-[0.13]
                   dark:opacity-[0.16]"
      >
        {book.abbr}
      </span>
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
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center" onClick={() => ready && onClose()}>
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
  onCitationGo,
  onShowCitations,
  citationCount,
}: {
  books: BibleBook[]
  pinnedBooks: string[]
  newlyPinned: string | null
  onSelect: (abbr: string) => void
  onLongPress: (book: BibleBook) => void
  onCitationGo: (parsed: ParsedCitation) => void
  onShowCitations: () => void
  citationCount: number
}) {
  const pinnedCardRef = useRef<HTMLButtonElement>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortMode, setSortMode] = useState<'organic' | 'alpha'>('organic')

  useEffect(() => {
    if (newlyPinned) {
      setTimeout(() => {
        pinnedCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 80)
    }
  }, [newlyPinned])

  const parsed = searchQuery.length >= 2 ? parseCitation(searchQuery, books) : null

  const filteredBooks = searchQuery.trim()
    ? books.filter(b =>
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.abbr.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : books

  const displayBooks = sortMode === 'alpha'
    ? [...filteredBooks].sort((a, b) => a.name.localeCompare(b.name, 'es'))
    : filteredBooks

  const pinned = displayBooks.filter(b => pinnedBooks.includes(b.abbr))
  const at = displayBooks.filter(b => b.testament === 'AT' && !pinnedBooks.includes(b.abbr))
  const nt = displayBooks.filter(b => b.testament === 'NT' && !pinnedBooks.includes(b.abbr))
  const isSearching = searchQuery.trim().length > 0

  return (
    <div className="pb-6 animate-fade-in">
      {/* Search + controls bar */}
      <div className="px-4 mb-4">
        {/* Search input */}
        <div className="relative mb-3">
          <Icon
            name="search"
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cafe-light dark:text-crema-400 pointer-events-none"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar libro o ir a cita (ej: Gn 1:1)"
            className="w-full bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                       rounded-2xl pl-10 pr-4 py-3 text-sm text-cafe-dark dark:text-crema-200
                       placeholder:text-cafe-light/60 dark:placeholder:text-crema-400/60
                       focus:outline-none focus:border-dorado/60 focus:ring-1 focus:ring-dorado/30
                       transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-cafe-light dark:text-crema-400 text-sm w-5 h-5 flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>

        {/* Controls row */}
        <div className="flex items-center gap-2">
          {/* Sort toggle */}
          <div className="flex rounded-xl overflow-hidden border border-crema-200 dark:border-oscuro-border flex-1">
            <button
              onClick={() => setSortMode('organic')}
              className={[
                'flex-1 text-xs py-2 px-3 font-medium transition-all flex items-center justify-center gap-1.5',
                sortMode === 'organic'
                  ? 'bg-dorado text-crema-50'
                  : 'bg-white dark:bg-oscuro-surface text-cafe-light dark:text-crema-400',
              ].join(' ')}
            >
              <Icon name="book-open" size={12} />
              Bíblico
            </button>
            <button
              onClick={() => setSortMode('alpha')}
              className={[
                'flex-1 text-xs py-2 px-3 font-medium transition-all flex items-center justify-center gap-1.5',
                sortMode === 'alpha'
                  ? 'bg-dorado text-crema-50'
                  : 'bg-white dark:bg-oscuro-surface text-cafe-light dark:text-crema-400',
              ].join(' ')}
            >
              <Icon name="sort-az" size={12} />
              A-Z
            </button>
          </div>

          {/* Saved citations button */}
          <button
            onClick={onShowCitations}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-xl
                       bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                       text-cafe-light dark:text-crema-400 text-xs font-medium
                       hover:border-dorado/50 hover:text-dorado transition-all relative"
          >
            <Icon name="bookmark" size={14} />
            <span>Citas</span>
            {citationCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-dorado text-crema-50 text-[9px] font-bold
                               w-4 h-4 rounded-full flex items-center justify-center leading-none">
                {citationCount > 99 ? '99+' : citationCount}
              </span>
            )}
          </button>
        </div>

        {/* Citation action */}
        {parsed && (
          <button
            onClick={() => onCitationGo(parsed)}
            className="w-full flex items-center gap-2.5 mt-3 py-3 px-4 rounded-2xl
                       bg-dorado/10 dark:bg-dorado/15 border border-dorado/30
                       active:scale-[0.98] transition-all group"
          >
            <Icon name="link" size={16} className="text-dorado shrink-0" />
            <div className="text-left flex-1 min-w-0">
              <p className="text-sm font-semibold text-dorado">
                Ir a {parsed.book.name} {parsed.chapter}{parsed.verse ? `:${parsed.verse}` : ''}
              </p>
              <p className="text-xs text-cafe-light dark:text-crema-400">
                {parsed.book.chaptersCount} capítulos
              </p>
            </div>
            <Icon name="chevron-right" size={16} className="text-dorado shrink-0" />
          </button>
        )}
      </div>

      {/* Fijados section (only when not searching or when pinned match) */}
      {!isSearching && pinned.length > 0 && (
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

      {/* Books list */}
      {isSearching || sortMode === 'alpha' ? (
        /* Flat list when searching or alphabetical */
        <div className="px-4">
          {isSearching && sortMode === 'organic' && (
            <h2 className="font-serif text-xs font-semibold text-dorado uppercase tracking-widest mb-3">
              Resultados
            </h2>
          )}
          <div className="grid grid-cols-2 gap-2">
            {displayBooks.map(book => (
              <BookCard
                key={book.abbr}
                book={book}
                pinned={pinnedBooks.includes(book.abbr)}
                highlighted={newlyPinned === book.abbr}
                onSelect={() => onSelect(book.abbr)}
                onLongPress={() => onLongPress(book)}
              />
            ))}
          </div>
          {displayBooks.length === 0 && (
            <p className="text-sm text-cafe-light dark:text-crema-400 text-center py-8">
              No se encontraron libros.
            </p>
          )}
        </div>
      ) : (
        /* Organic order grouped by testament */
        <>
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
        </>
      )}
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
            highlighted={newlyPinned === book.abbr}
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

// ── Share Verse Sheet ─────────────────────────────────────────────────────────
function ShareVerseSheet({
  url,
  onImageEditor,
  onClose,
}: {
  url: string
  onImageEditor: () => void
  onClose: () => void
}) {
  const [copied, setCopied] = useState(false)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 200)
    return () => clearTimeout(t)
  }, [])

  async function handleShareLink() {
    if (navigator.share) {
      try {
        await navigator.share({ url, title: 'Versículos bíblicos — Maná' })
        onClose()
        return
      } catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(onClose, 1500)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={() => ready && onClose()}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full bg-crema dark:bg-oscuro-bg rounded-t-3xl px-5 py-6 pb-10 shadow-2xl animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />
        <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200 mb-1">
          Compartir versículos
        </h2>
        <p className="text-xs text-cafe-light dark:text-crema-300 mb-5">
          Elegí cómo querés compartir los versículos seleccionados.
        </p>

        <div className="space-y-2.5">
          {/* Share link */}
          <button
            onClick={handleShareLink}
            className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl
                       bg-dorado/10 hover:bg-dorado/20 active:scale-[0.98] transition-all"
          >
            <Icon name={copied ? 'check' : 'link'} size={20} className={copied ? 'text-green-500' : 'text-dorado'} />
            <div className="text-left">
              <p className={`font-medium text-sm ${copied ? 'text-green-600 dark:text-green-400' : 'text-dorado'}`}>
                {copied ? '¡Enlace copiado!' : 'Compartir enlace'}
              </p>
              <p className="text-xs text-cafe-light dark:text-crema-400">
                Al abrirlo, los versículos se resaltan
              </p>
            </div>
          </button>

          {/* Image editor */}
          <button
            onClick={() => { onImageEditor(); onClose() }}
            className="w-full flex items-center gap-3 py-3.5 px-4 rounded-2xl
                       bg-dorado/10 hover:bg-dorado/20 active:scale-[0.98] transition-all"
          >
            <Icon name="image" size={20} className="text-dorado" />
            <div className="text-left">
              <p className="font-medium text-sm text-dorado">Crear imagen para Stories</p>
              <p className="text-xs text-cafe-light dark:text-crema-400">
                Personalizá y descargá una imagen 9:16
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Saved Citations View ──────────────────────────────────────────────────────
function CitationsView({
  onClose,
  onNavigate,
}: {
  onClose: () => void
  onNavigate: (abbr: string, chapter: number, verse?: number) => void
}) {
  const { savedCitations, removeSavedCitation } = useAppStore()
  const [editingCitation, setEditingCitation] = useState<SavedCitation | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')

  const allCategories = Array.from(new Set(savedCitations.map(c => c.category || 'Sin categoría')))

  const filtered = savedCitations.filter(c => {
    if (filterCategory) {
      const cat = c.category || 'Sin categoría'
      if (cat !== filterCategory) return false
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      return (
        c.bookName.toLowerCase().includes(q) ||
        c.comment.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.verseTexts.some(t => t.toLowerCase().includes(q))
      )
    }
    return true
  })

  // Group by category
  const grouped: Record<string, SavedCitation[]> = {}
  for (const c of filtered) {
    const cat = c.category || 'Sin categoría'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(c)
  }

  const verseLabel = (c: SavedCitation) =>
    c.verseNumbers.length === 1
      ? `${c.bookName} ${c.chapter}:${c.verseNumbers[0]}`
      : `${c.bookName} ${c.chapter}:${c.verseNumbers[0]}-${c.verseNumbers[c.verseNumbers.length - 1]}`

  return (
    <div className="animate-fade-in pb-6">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 mb-4">
        <button
          onClick={onClose}
          className="text-dorado hover:text-dorado-dark text-sm font-medium transition-colors py-1"
        >
          ← Libros
        </button>
        <span className="text-cafe-light dark:text-crema-300 text-sm">/</span>
        <span className="font-serif text-sm font-semibold text-cafe-dark dark:text-crema-200">
          Citas Guardadas
        </span>
        <span className="ml-auto text-xs text-cafe-light dark:text-crema-400">
          {savedCitations.length}
        </span>
      </div>

      {savedCitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-8 text-center gap-4">
          <span className="text-5xl">📌</span>
          <p className="font-serif text-lg font-semibold text-cafe-dark dark:text-crema-200">
            Todavía no guardaste citas
          </p>
          <p className="text-sm text-cafe-light dark:text-crema-400 leading-relaxed">
            Seleccioná versículos mientras lees la Biblia y tocá el ícono de marcador para guardarlos con un comentario y categoría.
          </p>
          <button
            onClick={onClose}
            className="btn-primary mt-2"
          >
            Ir a leer
          </button>
        </div>
      ) : (
        <>
          {/* Search */}
          <div className="px-4 mb-4 space-y-2.5">
            <div className="relative">
              <Icon name="search" size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-cafe-light dark:text-crema-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar en tus citas..."
                className="w-full bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                           rounded-2xl pl-9 pr-4 py-2.5 text-sm text-cafe-dark dark:text-crema-200
                           placeholder:text-cafe-light/60 dark:placeholder:text-crema-400/60
                           focus:outline-none focus:border-dorado/60 focus:ring-1 focus:ring-dorado/30
                           transition-colors"
              />
            </div>

            {/* Category filter pills */}
            {allCategories.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
                <button
                  onClick={() => setFilterCategory('')}
                  className={[
                    'flex-none text-xs font-medium px-3 py-1.5 rounded-full transition-all',
                    !filterCategory
                      ? 'bg-dorado text-crema-50'
                      : 'bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border text-cafe-light dark:text-crema-400',
                  ].join(' ')}
                >
                  Todas
                </button>
                {allCategories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setFilterCategory(cat === filterCategory ? '' : cat)}
                    className={[
                      'flex-none text-xs font-medium px-3 py-1.5 rounded-full transition-all whitespace-nowrap',
                      filterCategory === cat
                        ? 'bg-dorado text-crema-50'
                        : 'bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border text-cafe-light dark:text-crema-400',
                    ].join(' ')}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Citations grouped by category */}
          {Object.keys(grouped).length === 0 ? (
            <p className="text-sm text-cafe-light dark:text-crema-400 text-center py-8">
              No hay citas que coincidan con la búsqueda.
            </p>
          ) : (
            Object.entries(grouped).map(([cat, citations]) => (
              <div key={cat} className="mb-6 px-4">
                <h2 className="font-serif text-xs font-semibold text-dorado uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Icon name="bookmark" size={12} />
                  {cat}
                  <span className="text-cafe-light dark:text-crema-400 normal-case tracking-normal font-normal">
                    ({citations.length})
                  </span>
                </h2>
                <div className="space-y-2.5">
                  {citations.map(c => (
                    <div
                      key={c.id}
                      className="bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                                 rounded-2xl overflow-hidden"
                    >
                      <button
                        onClick={() => onNavigate(c.abbr, c.chapter, c.verseNumbers[0])}
                        className="w-full text-left px-4 pt-3.5 pb-2.5 hover:bg-crema-50 dark:hover:bg-oscuro-border
                                   active:scale-[0.99] transition-all"
                      >
                        <p className="text-xs font-semibold text-dorado mb-1.5">{verseLabel(c)}</p>
                        <p className="font-serif text-sm text-cafe-dark dark:text-crema-200 leading-relaxed line-clamp-3">
                          {c.verseTexts[0]}
                          {c.verseNumbers.length > 1 && ` …(${c.verseNumbers.length} vers.)`}
                        </p>
                        {c.comment && (
                          <p className="text-xs text-cafe-light dark:text-crema-400 mt-1.5 italic line-clamp-2">
                            "{c.comment}"
                          </p>
                        )}
                      </button>
                      <div className="flex items-center border-t border-crema-100 dark:border-oscuro-border px-4 py-2 gap-3">
                        <span className="text-[10px] text-cafe-light dark:text-crema-500 flex-1">
                          {new Date(c.savedAt).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        <button
                          onClick={() => setEditingCitation(c)}
                          className="text-xs text-cafe-light dark:text-crema-400 hover:text-dorado transition-colors py-1 px-2"
                        >
                          <Icon name="pencil" size={13} />
                        </button>
                        <button
                          onClick={() => removeSavedCitation(c.id)}
                          className="text-xs text-cafe-light dark:text-crema-400 hover:text-red-500 transition-colors py-1 px-2"
                        >
                          <Icon name="trash" size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </>
      )}

      {/* Edit modal */}
      {editingCitation && (
        <SaveCitationModal
          abbr={editingCitation.abbr}
          bookName={editingCitation.bookName}
          chapter={editingCitation.chapter}
          verseNumbers={editingCitation.verseNumbers}
          verseTexts={editingCitation.verseTexts}
          existing={editingCitation}
          onClose={() => setEditingCitation(null)}
        />
      )}
    </div>
  )
}

// ── Verse Reader ──────────────────────────────────────────────────────────────
type SlideDir = 'next' | 'prev' | null

function VerseReader({
  chapter,
  maxChapter,
  highlightVerses,
  focusMode,
  setFocusMode,
  onBack,
  onChapterChange,
  onSave,
  onShare,
  scrollContainerRef,
}: {
  chapter: BibleChapter
  maxChapter: number
  highlightVerses: number[]
  focusMode: boolean
  setFocusMode: (v: boolean) => void
  onBack: () => void
  onChapterChange: (delta: number) => void
  onSave: (verseNumbers: number[], verseTexts: string[]) => void
  onShare: (verseNumbers: number[], verseTexts: string[]) => void
  scrollContainerRef: React.RefObject<HTMLDivElement>
}) {
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const prevChapterRef = useRef(chapter.chapter)
  const [activeHighlights, setActiveHighlights] = useState<number[]>(highlightVerses)
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [showLectio, setShowLectio] = useState(false)
  const [showFocusExit, setShowFocusExit] = useState(false)
  const [slideDir, setSlideDir] = useState<SlideDir>(null)
  const [animKey, setAnimKey] = useState(0)

  useEffect(() => { setSelectedVerses(new Set()) }, [chapter.chapter])

  useEffect(() => {
    if (prevChapterRef.current !== chapter.chapter) {
      prevChapterRef.current = chapter.chapter
      setSlideDir(null)
      setAnimKey(k => k + 1)
    }
  }, [chapter.chapter])

  useEffect(() => {
    if (highlightVerses.length > 0) {
      setActiveHighlights(highlightVerses)
      setTimeout(() => {
        const firstVerse = highlightVerses[0]
        verseRefs.current[firstVerse]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 200)
      const timer = setTimeout(() => setActiveHighlights([]), 3500)
      return () => clearTimeout(timer)
    }
  }, [highlightVerses, chapter.chapter])

  function toggleVerse(n: number, e: React.MouseEvent) {
    if (focusMode) {
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
    setSlideDir(delta > 0 ? 'next' : 'prev')
    setAnimKey(k => k + 1)
    setTimeout(() => {
      onChapterChange(delta)
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0
      window.scrollTo({ top: 0 })
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
    if (e.target === e.currentTarget) setShowFocusExit(v => !v)
  }

  const sortedSelected = Array.from(selectedVerses).sort((a, b) => a - b)

  function handleSave() {
    const texts = sortedSelected.map(n => chapter.verses.find(v => v.number === n)?.text ?? '')
    onSave(sortedSelected, texts)
  }

  function handleShare() {
    const texts = sortedSelected.map(n => chapter.verses.find(v => v.number === n)?.text ?? '')
    onShare(sortedSelected, texts)
  }

  const slideClass = slideDir === 'next'
    ? 'animate-slide-out-left'
    : slideDir === 'prev'
      ? 'animate-slide-out-right'
      : 'animate-slide-in'

  const versesContent = (
    <div key={animKey} className={`px-3 space-y-0.5 ${slideClass}`}>
      {chapter.verses.map(verse => {
        const isSelected = selectedVerses.has(verse.number)
        const isHighlighted = activeHighlights.includes(verse.number)
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

      {/* Bottom chapter nav */}
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

  // ── Focus mode overlay ──────────────────────────────────────────────────────
  if (focusMode) {
    return (
      <div className="fixed inset-0 z-[90] bg-crema dark:bg-oscuro-bg overflow-y-auto">
        <div className="py-8 pb-32" onClick={toggleFocusExit}>
          {versesContent}
        </div>
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
          Tocá versículos para seleccionarlos
        </p>
      )}

      {versesContent}

      {/* Floating action bar */}
      {selectedVerses.size > 0 && (
        <div className="fixed bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] sm:max-w-[calc(28rem-2rem)] z-40 animate-slide-up">
          <div className="flex items-center gap-2 bg-white dark:bg-oscuro-surface
                          border border-crema-200 dark:border-oscuro-border
                          rounded-2xl shadow-lg px-3 py-2.5">
            <span className="text-xs text-cafe-light dark:text-crema-300 flex-1 min-w-0 truncate">
              {selectedVerses.size} vers. selecc.
            </span>

            {/* Save citation */}
            <button
              onClick={handleSave}
              title="Guardar cita"
              className="w-9 h-9 flex items-center justify-center rounded-xl
                         text-cafe-light dark:text-crema-400 hover:text-dorado hover:bg-dorado/10
                         active:scale-95 transition-all duration-150"
            >
              <Icon name="bookmark" size={18} />
            </button>

            {/* Share */}
            <button
              onClick={handleShare}
              title="Compartir"
              className="w-9 h-9 flex items-center justify-center rounded-xl
                         text-cafe-light dark:text-crema-400 hover:text-dorado hover:bg-dorado/10
                         active:scale-95 transition-all duration-150"
            >
              <Icon name="share" size={18} />
            </button>

            {/* Lectio Divina */}
            <button
              onClick={() => setShowLectio(true)}
              className="flex items-center gap-1.5 bg-dorado text-crema-50
                         rounded-xl px-3.5 py-2 text-sm font-semibold
                         active:scale-95 transition-all duration-150"
            >
              <span>🕯️</span>
              <span>Lectio</span>
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
type View = 'books' | 'chapters' | 'reader' | 'citas'

export default function BibliaPage() {
  const { book: urlBook, chapter: urlChapter } = useParams<{ book?: string; chapter?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { pinnedBooks, togglePinnedBook, setLastBiblePath, savedCitations } = useAppStore()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const [books, setBooks] = useState<BibleBook[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [booksError, setBooksError] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null)
  const [chapterData, setChapterData] = useState<BibleChapter | null>(null)
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [view, setView] = useState<View>('books')
  const [highlightVerses, setHighlightVerses] = useState<number[]>([])
  const [longPressBook, setLongPressBook] = useState<BibleBook | null>(null)
  const [focusMode, setFocusMode] = useState(false)
  const [newlyPinned, setNewlyPinned] = useState<string | null>(null)

  // Overlays
  const [saveCitationData, setSaveCitationData] = useState<{ verseNumbers: number[]; verseTexts: string[] } | null>(null)
  const [shareSheetData, setShareSheetData] = useState<{ url: string; verseNumbers: number[]; verseTexts: string[] } | null>(null)
  const [imageEditorData, setImageEditorData] = useState<ImageEditorData | null>(null)

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

    // Support both ?verso=N (single, legacy) and ?versos=N,M,... (multiple)
    const versosParam = searchParams.get('versos')
    const versoParam = searchParams.get('verso')
    let verses: number[] = []
    if (versosParam) {
      verses = versosParam.split(',').map(Number).filter(n => !isNaN(n) && n > 0)
    } else if (versoParam) {
      const n = parseInt(versoParam, 10)
      if (!isNaN(n)) verses = [n]
    }

    setSelectedBook(book)
    setView('reader')
    setHighlightVerses(verses)
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
    setHighlightVerses([])
    navigate(`/biblia/${selectedBook.abbr}/${chapter}`, { replace: true })
    loadChapter(selectedBook.abbr, chapter)
  }

  function handleChapterChange(delta: number) {
    if (!chapterData || !selectedBook) return
    const next = chapterData.chapter + delta
    if (next < 1 || next > selectedBook.chaptersCount) return
    setHighlightVerses([])
    navigate(`/biblia/${selectedBook.abbr}/${next}`, { replace: true })
    loadChapter(selectedBook.abbr, next)
  }

  function handleCitationGo(parsed: ParsedCitation) {
    const { book, chapter, verse } = parsed
    setSelectedBook(book)
    setView('reader')
    setHighlightVerses(verse ? [verse] : [])
    navigate(`/biblia/${book.abbr}/${chapter}`, { replace: true })
    loadChapter(book.abbr, chapter)
  }

  function handleSaveVerse(verseNumbers: number[], verseTexts: string[]) {
    setSaveCitationData({ verseNumbers, verseTexts })
  }

  function handleShareVerse(verseNumbers: number[], verseTexts: string[]) {
    if (!chapterData) return
    const url = `${window.location.origin}/biblia/${chapterData.book}/${chapterData.chapter}?versos=${verseNumbers.join(',')}`
    setShareSheetData({ url, verseNumbers, verseTexts })
  }

  function handleOpenImageEditor(verseNumbers: number[], verseTexts: string[]) {
    if (!chapterData) return
    const ref = verseNumbers.length === 1
      ? `${chapterData.bookName} ${chapterData.chapter}:${verseNumbers[0]}`
      : `${chapterData.bookName} ${chapterData.chapter}:${verseNumbers[0]}-${verseNumbers[verseNumbers.length - 1]}`
    setImageEditorData({
      headerLabel: 'BIBLIA',
      verseRef: ref,
      verses: verseNumbers.map((n, i) => ({ number: n, text: verseTexts[i] })),
    })
  }

  function handleCitationNavigate(abbr: string, chapter: number, verse?: number) {
    const book = books.find(b => b.abbr === abbr)
    if (!book) return
    setSelectedBook(book)
    setView('reader')
    setHighlightVerses(verse ? [verse] : [])
    navigate(`/biblia/${abbr}/${chapter}`, { replace: true })
    loadChapter(abbr, chapter)
  }

  const subtitle = view === 'reader' && chapterData
    ? `${chapterData.bookName} ${chapterData.chapter}`
    : view === 'chapters' && selectedBook
      ? selectedBook.name
      : view === 'citas'
        ? 'Citas guardadas'
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
            onCitationGo={handleCitationGo}
            onShowCitations={() => setView('citas')}
            citationCount={savedCitations.length}
          />
        ) : view === 'citas' ? (
          <CitationsView
            onClose={() => setView('books')}
            onNavigate={handleCitationNavigate}
          />
        ) : view === 'chapters' && selectedBook ? (
          <ChapterSelector
            book={selectedBook}
            onSelect={handleSelectChapter}
            onBack={() => { setView('books'); navigate('/biblia', { replace: true }) }}
          />
        ) : view === 'reader' ? (
          loadingChapter && !chapterData ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-pulse-soft">
              <span className="text-4xl">📖</span>
              <p className="text-sm text-cafe-light dark:text-crema-300">Cargando capítulo...</p>
            </div>
          ) : chapterData && selectedBook ? (
            <VerseReader
              chapter={chapterData}
              maxChapter={selectedBook.chaptersCount}
              highlightVerses={highlightVerses}
              focusMode={focusMode}
              setFocusMode={setFocusMode}
              onBack={() => setView('chapters')}
              onChapterChange={handleChapterChange}
              onSave={handleSaveVerse}
              onShare={handleShareVerse}
              scrollContainerRef={scrollContainerRef}
            />
          ) : null
        ) : null}

        <BugReportLink />
      </div>

      {/* Long-press popup */}
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

      {/* Save citation modal */}
      {saveCitationData && chapterData && selectedBook && (
        <SaveCitationModal
          abbr={chapterData.book}
          bookName={chapterData.bookName}
          chapter={chapterData.chapter}
          verseNumbers={saveCitationData.verseNumbers}
          verseTexts={saveCitationData.verseTexts}
          onClose={() => setSaveCitationData(null)}
        />
      )}

      {/* Share verse sheet */}
      {shareSheetData && (
        <ShareVerseSheet
          url={shareSheetData.url}
          onImageEditor={() => handleOpenImageEditor(shareSheetData.verseNumbers, shareSheetData.verseTexts)}
          onClose={() => setShareSheetData(null)}
        />
      )}

      {/* Image editor modal */}
      {imageEditorData && (
        <ImageEditorModal
          data={imageEditorData}
          onClose={() => setImageEditorData(null)}
        />
      )}
    </div>
  )
}
