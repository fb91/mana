import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { api, BibleBook, BibleChapter, LectioBiblicaResponse } from '../services/api'
import { downloadLectioPDF } from '../lib/lectio-pdf'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

// ── Book Selector ────────────────────────────────────────────────────────────

function BookSelector({
  books,
  onSelect,
}: {
  books: BibleBook[]
  onSelect: (abbr: string) => void
}) {
  const at = books.filter(b => b.testament === 'AT')
  const nt = books.filter(b => b.testament === 'NT')

  return (
    <div className="pb-6 animate-fade-in">
      <TestamentSection title="Antiguo Testamento" books={at} onSelect={onSelect} />
      <TestamentSection title="Nuevo Testamento" books={nt} onSelect={onSelect} />
    </div>
  )
}

function TestamentSection({
  title,
  books,
  onSelect,
}: {
  title: string
  books: BibleBook[]
  onSelect: (abbr: string) => void
}) {
  if (books.length === 0) return null
  return (
    <div className="mb-6 px-4">
      <h2 className="font-serif text-xs font-semibold text-dorado uppercase tracking-widest mb-3">
        {title}
      </h2>
      <div className="grid grid-cols-2 gap-2">
        {books.map(book => (
          <button
            key={book.abbr}
            onClick={() => onSelect(book.abbr)}
            className="bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                       rounded-2xl shadow-sm text-left py-3 px-4
                       hover:border-dorado/60 hover:shadow-md active:scale-95
                       transition-all duration-150 group"
          >
            <p className="text-sm font-medium text-cafe-dark dark:text-crema-200
                          group-hover:text-dorado transition-colors leading-tight">
              {book.name}
            </p>
            <p className="text-xs text-cafe-light dark:text-crema-300 mt-0.5">
              {book.chaptersCount} cap.
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Chapter Selector ─────────────────────────────────────────────────────────

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

// ── PDF Download Button ──────────────────────────────────────────────────────

function DownloadPDFButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2.5
                 border border-dorado/40 text-dorado rounded-2xl py-3 px-4
                 hover:bg-dorado/10 active:scale-[0.98]
                 transition-all duration-150 group"
    >
      {/* Download icon */}
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

// ── Lectio Divina Modal ──────────────────────────────────────────────────────

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
      <div className="relative bg-crema dark:bg-oscuro-bg rounded-t-3xl px-5 pt-5 pb-24
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

        {/* Verses from bible_es.json — always shown, never generated by AI */}
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

            {/* PDF button — top */}
            <DownloadPDFButton onClick={() => downloadLectioPDF(result, chapter, selectedVerses)} />

            {/* Lectio */}
            <LectioSection titulo="Lectio · Leer" color="dorado">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.lectio}</p>
            </LectioSection>

            {/* Meditatio */}
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

            {/* Oratio */}
            <LectioSection titulo="Oratio · Orar" color="dorado">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.oratio}</p>
            </LectioSection>

            {/* Contemplatio */}
            <LectioSection titulo="Contemplatio · Contemplar" color="cafe">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.contemplatio}</p>
            </LectioSection>

            {/* Preguntas para profundizar */}
            <div className="bg-dorado/10 dark:bg-dorado/15 border border-dorado/30 rounded-2xl p-4">
              <p className="text-xs font-semibold text-dorado uppercase tracking-wider mb-3">
                Para profundizar
              </p>
              <ul className="space-y-3">
                {result.preguntasProfundas.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-cafe-dark dark:text-crema-200">
                    <span className="text-dorado font-bold shrink-0">›</span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* PDF button — bottom */}
            <DownloadPDFButton onClick={() => downloadLectioPDF(result, chapter, selectedVerses)} />

          </div>
        ) : null}
      </div>
    </div>
  )
}

function LectioSection({
  titulo, color, children,
}: {
  titulo: string
  color: 'dorado' | 'cafe'
  children: React.ReactNode
}) {
  const border = color === 'dorado' ? 'border-dorado/40' : 'border-cafe-light/40'
  return (
    <div className={`border-l-2 ${border} pl-4`}>
      <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wider mb-2">
        {titulo}
      </p>
      {children}
    </div>
  )
}

// ── Verse Reader ─────────────────────────────────────────────────────────────

function VerseReader({
  chapter,
  highlightVerse,
  onBack,
  onChapterChange,
}: {
  chapter: BibleChapter
  highlightVerse: number | null
  onBack: () => void
  onChapterChange: (delta: number) => void
}) {
  const verseRefs = useRef<Record<number, HTMLDivElement | null>>({})
  const [activeHighlight, setActiveHighlight] = useState<number | null>(highlightVerse)
  const [selectedVerses, setSelectedVerses] = useState<Set<number>>(new Set())
  const [showLectio, setShowLectio] = useState(false)

  useEffect(() => {
    // Clear selection when chapter changes
    setSelectedVerses(new Set())
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

  function toggleVerse(n: number) {
    setSelectedVerses(prev => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }

  const sortedSelected = Array.from(selectedVerses).sort((a, b) => a - b)

  return (
    <div className="animate-fade-in">
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
        <div className="flex gap-3">
          <button
            onClick={() => onChapterChange(-1)}
            disabled={chapter.chapter <= 1}
            className="text-dorado hover:text-dorado-dark text-sm transition-colors disabled:opacity-30 py-1"
          >
            ‹ ant.
          </button>
          <button
            onClick={() => onChapterChange(1)}
            className="text-dorado hover:text-dorado-dark text-sm transition-colors py-1"
          >
            sig. ›
          </button>
        </div>
      </div>

      {/* Selection hint */}
      {selectedVerses.size === 0 && (
        <p className="text-center text-xs text-cafe-light dark:text-crema-300 mb-3 px-4">
          Tocá versículos para seleccionarlos e iniciar una Lectio Divina
        </p>
      )}

      {/* Verses */}
      <div className="px-3 pb-32 space-y-0.5">
        {chapter.verses.map(verse => {
          const isSelected = selectedVerses.has(verse.number)
          const isHighlighted = activeHighlight === verse.number
          return (
            <div
              key={verse.number}
              ref={el => { verseRefs.current[verse.number] = el }}
              onClick={() => toggleVerse(verse.number)}
              className={`rounded-xl px-3 py-2.5 cursor-pointer select-none transition-all duration-200 ${
                isSelected
                  ? 'bg-dorado/20 dark:bg-dorado/25 ring-1 ring-dorado/50'
                  : isHighlighted
                    ? 'bg-dorado/25 dark:bg-dorado/30 ring-1 ring-dorado/60'
                    : 'hover:bg-crema-100 dark:hover:bg-oscuro-surface active:bg-crema-200 dark:active:bg-oscuro-border'
              }`}
            >
              {isSelected && (
                <span className="text-dorado text-xs mr-1 select-none">✓</span>
              )}
              <span className={`font-bold text-xs mr-2 select-none align-top leading-6 ${
                isSelected ? 'text-dorado' : 'text-dorado/70'
              }`}>
                {verse.number}
              </span>
              <span className="text-cafe-dark dark:text-crema-200 text-[15px] leading-relaxed">
                {verse.text}
              </span>
            </div>
          )
        })}
      </div>

      {/* Floating Lectio bar */}
      {selectedVerses.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 px-4 z-40 animate-slide-up">
          <div className="flex items-center gap-2 bg-white dark:bg-oscuro-surface
                          border border-crema-200 dark:border-oscuro-border
                          rounded-2xl shadow-lg px-4 py-3">
            <span className="text-xs text-cafe-light dark:text-crema-300 flex-1">
              {selectedVerses.size} versículo{selectedVerses.size > 1 ? 's' : ''} seleccionado{selectedVerses.size > 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setSelectedVerses(new Set())}
              className="text-xs text-cafe-light dark:text-crema-300 hover:text-cafe-dark
                         transition-colors px-2 py-1"
            >
              limpiar
            </button>
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

      {/* Lectio Modal */}
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

// ── Main Page ────────────────────────────────────────────────────────────────

type View = 'books' | 'chapters' | 'reader'

export default function BibliaPage() {
  const { book: urlBook, chapter: urlChapter } = useParams<{ book?: string; chapter?: string }>()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [books, setBooks] = useState<BibleBook[]>([])
  const [loadingBooks, setLoadingBooks] = useState(true)
  const [booksError, setBooksError] = useState(false)
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null)
  const [chapterData, setChapterData] = useState<BibleChapter | null>(null)
  const [loadingChapter, setLoadingChapter] = useState(false)
  const [view, setView] = useState<View>('books')
  const [highlightVerse, setHighlightVerse] = useState<number | null>(null)

  useEffect(() => {
    api.getBibleBooks()
      .then(data => {
        setBooks(data)
        setLoadingBooks(false)
      })
      .catch(() => {
        setBooksError(true)
        setLoadingBooks(false)
      })
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
    try {
      const data = await api.getBibleChapter(book, chapter)
      setChapterData(data)
    } finally {
      setLoadingChapter(false)
    }
  }, [])

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

      <div className="flex-1 overflow-y-auto pt-4">
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
            onSelect={handleSelectBook}
          />
        ) : view === 'chapters' && selectedBook ? (
          <ChapterSelector
            book={selectedBook}
            onSelect={handleSelectChapter}
            onBack={() => { setView('books'); navigate('/biblia', { replace: true }) }}
          />
        ) : view === 'reader' ? (
          loadingChapter ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 animate-pulse-soft">
              <span className="text-4xl">📖</span>
              <p className="text-sm text-cafe-light dark:text-crema-300">Cargando capítulo...</p>
            </div>
          ) : chapterData ? (
            <VerseReader
              chapter={chapterData}
              highlightVerse={highlightVerse}
              onBack={() => setView('chapters')}
              onChapterChange={handleChapterChange}
            />
          ) : null
        ) : null}
      </div>

    </div>
  )
}
