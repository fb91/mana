import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { IconName } from '../components/Icon'
import { useAppStore } from '../store/useAppStore'
import { BugReportLink } from '../components/BugReportButton'
import { api, BibliaRecomendacion, BibleBook, LectioBiblicaResponse } from '../services/api'
import { getBibleVerse, getBibleBooks, getBibleChapter, BOOK_NAME } from '../lib/bible'
import { downloadLectioPDF } from '../lib/lectio-pdf'


interface Quote {
  text: string
  cite: string
  abbr: string
  chapter: number
  verse: number
}

const QUOTES: Quote[] = [
  { text: '«El que come este pan vivirá para siempre.»', cite: 'Jn 6,58',    abbr: 'Jn',   chapter: 6,   verse: 58  },
  { text: '«Mi carne es verdadera comida.»',             cite: 'Jn 6,55',    abbr: 'Jn',   chapter: 6,   verse: 55  },
  { text: '«Ábreme los ojos.»',                          cite: 'Sal 119,18', abbr: 'Sal',  chapter: 119, verse: 18  },
  { text: '«Escuchen la voz del Señor.»',                cite: 'Sal 95,7',   abbr: 'Sal',  chapter: 95,  verse: 7   },
  { text: '«Permanezcan despiertos y oren.»',            cite: 'Mt 26,41',   abbr: 'Mt',   chapter: 26,  verse: 41  },
  { text: '«Oren sin cesar.»',                           cite: '1 Tes 5,17', abbr: '1Tes', chapter: 5,   verse: 17  },
  { text: '«El Señor está cerca.»',                      cite: 'Flp 4,5',    abbr: 'Flp',  chapter: 4,   verse: 5   },
  { text: '«Busquen y encontrarán.»',                    cite: 'Mt 7,7',     abbr: 'Mt',   chapter: 7,   verse: 7   },
  { text: '«Llamen y se les abrirá.»',                   cite: 'Mt 7,7',     abbr: 'Mt',   chapter: 7,   verse: 7   },
  { text: '«Mis ovejas escuchan mi voz.»',               cite: 'Jn 10,27',   abbr: 'Jn',   chapter: 10,  verse: 27  },
  { text: '«No teman.»',                                 cite: 'Mt 14,27',   abbr: 'Mt',   chapter: 14,  verse: 27  },
  { text: '«Yo estaré siempre con ustedes.»',            cite: 'Mt 28,20',   abbr: 'Mt',   chapter: 28,  verse: 20  },
  { text: '«Les doy mi paz.»',                           cite: 'Jn 14,27',   abbr: 'Jn',   chapter: 14,  verse: 27  },
  { text: '«Confía en el Señor.»',                       cite: 'Prov 3,5',   abbr: 'Prov', chapter: 3,   verse: 5   },
]

const EMOTIONS = [
  'Angustiado',
  'Triste',
  'Ansioso',
  'Cansado',
  'Perdido',
  'Solo',
  'Agradecido',
  'Esperanzado',
  'Alegre',
  'Confiado',
]

interface Tool {
  icon: IconName
  title: string
  description: string
  to: string
  soon?: boolean
}

// "/biblia/Gn/1" → "Génesis · Capítulo 1"
function formatBiblePath(path: string): string {
  const match = path.match(/^\/biblia\/([^/]+)\/(\d+)/)
  if (!match) return 'Biblia'
  const [, abbr, chapter] = match
  const NAMES: Record<string, string> = {
    Gn: 'Génesis', Ex: 'Éxodo', Lv: 'Levítico', Nm: 'Números', Dt: 'Deuteronomio',
    Jos: 'Josué', Jue: 'Jueces', Rt: 'Rut', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
    '1Re': '1 Reyes', '2Re': '2 Reyes', '1Cr': '1 Crónicas', '2Cr': '2 Crónicas',
    Esd: 'Esdras', Neh: 'Nehemías', Tb: 'Tobías', Jdt: 'Judit', Est: 'Ester',
    '1Mac': '1 Macabeos', '2Mac': '2 Macabeos', Job: 'Job', Sal: 'Salmos',
    Pr: 'Proverbios', Ecl: 'Eclesiastés', Ct: 'Cantares', Sab: 'Sabiduría',
    Sir: 'Eclesiástico', Is: 'Isaías', Jr: 'Jeremías', Lm: 'Lamentaciones',
    Bar: 'Baruc', Ez: 'Ezequiel', Dn: 'Daniel', Os: 'Oseas', Jl: 'Joel',
    Am: 'Amós', Abd: 'Abdías', Jon: 'Jonás', Mi: 'Miqueas', Na: 'Nahúm',
    Hab: 'Habacuc', Sof: 'Sofonías', Ag: 'Ageo', Za: 'Zacarías', Mal: 'Malaquías',
    Mt: 'Mateo', Mc: 'Marcos', Lc: 'Lucas', Jn: 'Juan', Hch: 'Hechos',
    Rm: 'Romanos', '1Co': '1 Corintios', '2Co': '2 Corintios', Ga: 'Gálatas',
    Ef: 'Efesios', Flp: 'Filipenses', Col: 'Colosenses', '1Ts': '1 Tesalonicenses',
    '2Ts': '2 Tesalonicenses', '1Tm': '1 Timoteo', '2Tm': '2 Timoteo',
    Tt: 'Tito', Flm: 'Filemón', Hb: 'Hebreos', St: 'Santiago',
    '1Pe': '1 Pedro', '2Pe': '2 Pedro', '1Jn': '1 Juan', '2Jn': '2 Juan',
    '3Jn': '3 Juan', Jds: 'Judas', Ap: 'Apocalipsis',
  }
  const name = NAMES[abbr] ?? abbr
  return `${name} · Capítulo ${chapter}`
}

const IS_PROD = import.meta.env.PROD

const recursos: Tool[] = [
  {
    icon: 'book-open',
    title: 'La Biblia',
    description: 'Leé cualquier libro y capítulo. Hacé Lectio Divina sobre los pasajes que te toquen.',
    to: '/biblia',
  },
  {
    icon: 'beads',
    title: 'Novenas',
    description: 'Rezá novenas con recordatorios diarios. Acompañarte con la intercesión de los santos.',
    to: '/novenas',
    soon: IS_PROD,
  },
  {
    icon: 'clipboard',
    title: 'Examen de conciencia',
    description: 'Preparate para la confesión con preguntas adaptadas a tu perfil. Descargá tu examen.',
    to: '/examen',
    soon: IS_PROD,
  },
  {
    icon: 'archive',
    title: 'Devocionario',
    description: 'Oraciones tradicionales, jaculatorias y devociones para cada momento del día.',
    to: '',
    soon: true,
  },
]

const herramientas: Tool[] = [
  {
    icon: 'book-open',
    title: 'Lectio Divina',
    description: 'Meditá profundamente sobre cualquier pasaje bíblico con guía de IA.',
    to: '#lectio',
  },
  {
    icon: 'star',
    title: '¿Con qué santo conectás?',
    description: 'Descubrí los santos de la Iglesia que mejor conectan con tu vida y espiritualidad.',
    to: '/santo',
  },
]

// ── Helpers for Lectio Modal ────────────────────────────────────────────────
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

function LectioSection({ titulo, color, children }: { titulo: string; color: 'dorado' | 'cafe'; children: React.ReactNode }) {
  const border = color === 'dorado' ? 'border-dorado/40' : 'border-cafe-light/40'
  return (
    <div className={`border-l-2 ${border} pl-4`}>
      <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wider mb-2">{titulo}</p>
      {children}
    </div>
  )
}

// ── Lectio Divina Modal ────────────────────────────────────────────────────
function LectioModal({
  book,
  chapter,
  verseFrom,
  verseTo,
  onClose,
}: {
  book: string
  chapter: number
  verseFrom: number
  verseTo: number
  onClose: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<LectioBiblicaResponse | null>(null)
  const [error, setError] = useState('')
  const [verses, setVerses] = useState<{ number: number; text: string }[]>([])

  useEffect(() => {
    async function loadLectio() {
      try {
        const chapterData = await getBibleChapter(book, chapter)
        const selectedVerses = chapterData.verses.filter(v => v.number >= verseFrom && v.number <= verseTo)
        setVerses(selectedVerses)
        
        const verseNumbers = selectedVerses.map(v => v.number)
        const verseTexts = selectedVerses.map(v => v.text)
        const bookName = BOOK_NAME[book] || book
        
        const lectioResult = await api.getLectioBiblica(book, bookName, chapter, verseNumbers, verseTexts)
        setResult(lectioResult)
      } catch {
        setError('No se pudo preparar la Lectio. Intentá de nuevo.')
      } finally {
        setLoading(false)
      }
    }
    loadLectio()
  }, [book, chapter, verseFrom, verseTo])

  const bookName = BOOK_NAME[book] || book
  const versoLabel = verseFrom === verseTo
    ? `${bookName} ${chapter}:${verseFrom}`
    : `${bookName} ${chapter}:${verseFrom}-${verseTo}`

  function handleDownloadPDF() {
    if (!result) return
    const chapterData = {
      book,
      bookName,
      chapter,
      verses,
    }
    const selectedVerseNumbers = verses.map(v => v.number)
    downloadLectioPDF(result, chapterData, selectedVerseNumbers)
  }

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
            {verses.map(verse => (
              <p key={verse.number} className="font-serif text-[15px] text-cafe-dark dark:text-crema-200 leading-relaxed">
                <span className="text-dorado font-bold text-xs mr-2 align-top leading-6 select-none">
                  {verse.number}
                </span>
                {verse.text}
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
            <DownloadPDFButton onClick={handleDownloadPDF} />
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
            <DownloadPDFButton onClick={handleDownloadPDF} />
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

export default function InicioPage() {
  const navigate = useNavigate()
  const lastBiblePath = useAppStore(s => s.lastBiblePath)
  const [quote] = useState<Quote>(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  // About modal
  const [showAbout, setShowAbout] = useState(false)

  // Emotion and recommendation
  const { recentRecommendations, addRecommendation } = useAppStore()
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [customFeeling, setCustomFeeling] = useState('')
  const [showCustomInput, setShowCustomInput] = useState(false)
  const [loadingRec, setLoadingRec] = useState(false)
  const [recommendation, setRecommendation] = useState<BibliaRecomendacion | null>(null)
  const [errorRec, setErrorRec] = useState('')

  // Lectio Divina selector
  const [showLectioSelector, setShowLectioSelector] = useState(false)
  const [showLectioModal, setShowLectioModal] = useState(false)
  const [bibleBooks, setBibleBooks] = useState<BibleBook[]>([])
  const [selectedBook, setSelectedBook] = useState('')
  const [selectedChapter, setSelectedChapter] = useState(0)
  const [verseFrom, setVerseFrom] = useState(0)
  const [verseTo, setVerseTo] = useState(0)
  const [versesPreview, setVersesPreview] = useState<string[]>([])
  const [maxVerses, setMaxVerses] = useState(0)

  // Load bible books for lectio selector
  useEffect(() => {
    getBibleBooks().then(setBibleBooks)
  }, [])

  async function handleGetRecommendation() {
    const feeling = customFeeling.trim() || selectedEmotions.join(', ')
    if (!feeling || loadingRec) return

    setLoadingRec(true)
    setErrorRec('')
    setRecommendation(null)

    try {
      const rec = await api.getBibliaRecomendacion(feeling, recentRecommendations)
      const verseText = await getBibleVerse(rec.libro, rec.capitulo, rec.versiculo)
      setRecommendation({ ...rec, textoVersiculo: verseText ?? '' })
      addRecommendation(`${rec.libro} ${rec.capitulo}:${rec.versiculo}`)
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_INPUT') {
        setErrorRec('Contanos algo sobre cómo te sentís para buscarte un pasaje que te acompañe.')
      } else {
        setErrorRec('No se pudo obtener una recomendación. Intentá de nuevo.')
      }
    } finally {
      setLoadingRec(false)
    }
  }

  function handleEmotionClick(emotion: string) {
    setSelectedEmotions(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    )
    setShowCustomInput(false)
    setCustomFeeling('')
  }

  function handleCustomClick() {
    setShowCustomInput(!showCustomInput)
    setSelectedEmotions([])
  }

  function handleGoToPassage() {
    if (!recommendation) return
    navigate(`/biblia/${recommendation.libro}/${recommendation.capitulo}?verso=${recommendation.versiculo}`)
  }

  // When book changes, load chapter count
  async function handleBookChange(bookAbbr: string) {
    setSelectedBook(bookAbbr)
    setSelectedChapter(0)
    setVerseFrom(0)
    setVerseTo(0)
    setVersesPreview([])
    setMaxVerses(0)
  }

  // When chapter changes, load verse count
  async function handleChapterChange(chapter: number) {
    setSelectedChapter(chapter)
    setVerseFrom(0)
    setVerseTo(0)
    setVersesPreview([])
    if (selectedBook && chapter > 0) {
      try {
        const chapterData = await getBibleChapter(selectedBook, chapter)
        setMaxVerses(chapterData.verses.length)
      } catch {
        setMaxVerses(0)
      }
    }
  }

  // When verses change, update preview
  async function handleVerseChange(from: number, to: number) {
    setVerseFrom(from)
    setVerseTo(to)
    if (selectedBook && selectedChapter && from > 0 && to >= from) {
      try {
        const chapterData = await getBibleChapter(selectedBook, selectedChapter)
        const preview = chapterData.verses
          .filter(v => v.number >= from && v.number <= to)
          .map(v => `${v.number}. ${v.text}`)
        setVersesPreview(preview)
      } catch {
        setVersesPreview([])
      }
    } else {
      setVersesPreview([])
    }
  }

  function handleStartLectioDivina() {
    if (!selectedBook || !selectedChapter || !verseFrom || !verseTo) return
    setShowLectioModal(true)
  }

  return (
    <div className="flex flex-col h-screen">

      {/* Header personalizado */}
      <header className="sticky top-0 z-10 bg-crema/95 dark:bg-oscuro-bg/95 backdrop-blur-sm
                          border-b border-crema-200 dark:border-oscuro-border px-5 py-4 relative">
        <div className="flex items-center gap-3 pr-12">
          <h1 className="font-serif text-5xl font-semibold text-cafe-dark dark:text-crema-200 leading-none">
            Maná
          </h1>
          <div className="w-px h-8 bg-crema-300 dark:bg-oscuro-border" />
          <p className="text-sm text-cafe-light dark:text-crema-300 leading-snug max-w-[160px] break-words italic">
            {quote.text}
            <button
              onClick={() => navigate(`/biblia/${quote.abbr}/${quote.chapter}?verso=${quote.verse}`)}
              className="not-italic font-semibold block mt-0.5 text-xs text-dorado hover:underline active:opacity-70"
            >
              — {quote.cite}
            </button>
          </p>
        </div>
        
        {/* About button - icon only */}
        <button
          onClick={() => setShowAbout(true)}
          className="absolute top-1/2 -translate-y-1/2 right-4 w-9 h-9 rounded-full
                     bg-dorado/10 hover:bg-dorado/20 active:scale-95 transition-all
                     flex items-center justify-center"
          aria-label="Acerca de Maná"
        >
          <Icon name="info" size={18} className="text-dorado" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 animate-fade-in">

        {/* ¿Cómo te sientes hoy? */}
        <div className="mb-6 rounded-3xl bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                        px-5 py-5 shadow-sm">
          <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 text-lg mb-3">
            ¿Cómo te sientes hoy?
          </h2>

          {/* Emotion pills */}
          <div className="flex flex-wrap gap-2 mb-4">
            {EMOTIONS.map(emotion => (
              <button
                key={emotion}
                onClick={() => handleEmotionClick(emotion)}
                className={[
                  'px-4 py-2 rounded-full text-sm font-medium transition-all',
                  selectedEmotions.includes(emotion)
                    ? 'bg-dorado text-white shadow-md'
                    : 'bg-crema-100 dark:bg-oscuro-bg text-cafe-dark dark:text-crema-200 hover:bg-dorado/20'
                ].join(' ')}
              >
                {emotion}
              </button>
            ))}
            <button
              onClick={handleCustomClick}
              className={[
                'px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2',
                showCustomInput
                  ? 'bg-dorado text-white shadow-md'
                  : 'bg-crema-100 dark:bg-oscuro-bg text-cafe-dark dark:text-crema-200 hover:bg-dorado/20'
              ].join(' ')}
            >
              <Icon name="pencil" size={14} />
            </button>
          </div>

          {/* Custom feeling input */}
          {showCustomInput && (
            <div className="mb-4 animate-fade-in">
              <textarea
                value={customFeeling}
                onChange={e => setCustomFeeling(e.target.value)}
                placeholder="Describe cómo te sientes..."
                rows={3}
                className="input-field text-sm w-full resize-none"
                autoFocus
              />
            </div>
          )}

          {/* CTA button */}
          <button
            onClick={handleGetRecommendation}
            disabled={(selectedEmotions.length === 0 && !customFeeling.trim()) || loadingRec}
            className="btn-primary w-full"
          >
            {loadingRec ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-pulse-soft">✨</span>
                Buscando pasaje...
              </span>
            ) : (
              'Recomiéndame un pasaje'
            )}
          </button>

          {errorRec && (
            <p className="text-xs text-red-500 mt-3">{errorRec}</p>
          )}
        </div>

        {/* Continuar leyendo */}
        {lastBiblePath && (
          <button
            onClick={() => navigate(lastBiblePath)}
            className="w-full mb-4 rounded-2xl text-left flex items-center gap-4 px-5 py-4
                       bg-cafe-dark dark:bg-dorado/90
                       active:scale-[0.98] transition-all duration-200 shadow-md"
          >
            <Icon name="book-open" size={20} className="text-crema/70 dark:text-cafe-dark/70 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-crema/60 dark:text-cafe-dark/60 mb-0.5">
                Continuar leyendo
              </p>
              <p className="font-serif font-semibold text-crema dark:text-cafe-dark leading-tight truncate">
                {formatBiblePath(lastBiblePath)}
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="text-crema/50 dark:text-cafe-dark/50 flex-shrink-0" />
          </button>
        )}

        {/* RECURSOS Section */}
        <div className="h-px bg-crema-200 dark:bg-oscuro-border my-6" />
        <h2 className="font-serif font-bold text-cafe-dark dark:text-crema-200 text-sm uppercase tracking-widest mb-4">
          RECURSOS
        </h2>
        <div className="grid grid-cols-1 gap-3 mb-6">
          {recursos.map((tool) => (
            <button
              key={tool.title}
              onClick={() => !tool.soon && navigate(tool.to)}
              disabled={tool.soon}
              className={[
                'card text-left flex items-start gap-4 transition-all duration-200',
                tool.soon
                  ? 'opacity-60 cursor-default'
                  : 'hover:border-dorado/50 hover:shadow-md active:scale-[0.98]',
              ].join(' ')}
            >
              <div className="w-12 h-12 rounded-2xl bg-dorado/10 dark:bg-dorado/15 flex items-center justify-center flex-shrink-0 text-dorado">
                <Icon name={tool.icon} size={22} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight">
                    {tool.title}
                  </p>
                  {tool.soon && (
                    <span className="text-[10px] font-bold uppercase tracking-wide text-dorado
                                     bg-dorado/10 px-2 py-0.5 rounded-full border border-dorado/30">
                      Próximamente
                    </span>
                  )}
                </div>
                <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                  {tool.description}
                </p>
              </div>

              {!tool.soon && (
                <Icon name="chevron-right" size={18} className="text-dorado/50 flex-shrink-0 mt-0.5" />
              )}
            </button>
          ))}
        </div>

        {/* HERRAMIENTAS Section */}
        <div className="h-px bg-crema-200 dark:bg-oscuro-border my-6" />
        <h2 className="font-serif font-bold text-cafe-dark dark:text-crema-200 text-sm uppercase tracking-widest mb-2">
          HERRAMIENTAS
        </h2>
        <p className="text-[11px] text-cafe-light/70 dark:text-crema-400/70 leading-snug mb-4">
          El contenido de estas herramientas está generado con IA, a excepción de las citas bíblicas que son literales.
          La IA puede cometer errores.
        </p>
        <div className="grid grid-cols-1 gap-3">
          {herramientas.map((tool) => (
            <div key={tool.title}>
              <button
                onClick={() => {
                  if (tool.to === '#lectio') {
                    setShowLectioSelector(!showLectioSelector)
                  } else {
                    navigate(tool.to)
                  }
                }}
                className={[
                  'card text-left flex items-start gap-4 transition-all duration-200 w-full',
                  showLectioSelector && tool.to === '#lectio'
                    ? 'border-dorado/50 shadow-md rounded-b-none'
                    : 'hover:border-dorado/50 hover:shadow-md active:scale-[0.98]'
                ].join(' ')}
              >
                <div className="w-12 h-12 rounded-2xl bg-dorado/10 dark:bg-dorado/15 flex items-center justify-center flex-shrink-0 text-dorado">
                  <Icon name={tool.icon} size={22} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight mb-1">
                    {tool.title}
                  </p>
                  <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <Icon 
                  name={showLectioSelector && tool.to === '#lectio' ? 'chevron-up' : 'chevron-right'} 
                  size={18} 
                  className="text-dorado/50 flex-shrink-0 mt-0.5 transition-transform" 
                />
              </button>

              {/* Lectio Divina selector - accordion style */}
              {tool.to === '#lectio' && showLectioSelector && (
                <div className="bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                                border-t-0 rounded-b-2xl px-5 py-5 animate-fade-in">
                  <h3 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-3">
                    Seleccioná un pasaje
                  </h3>

            {/* Book selector */}
            <div className="mb-3">
              <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-1 block">
                Libro
              </label>
              <select
                value={selectedBook}
                onChange={e => handleBookChange(e.target.value)}
                className="input-field text-sm w-full"
              >
                <option value="">Seleccionar libro...</option>
                <optgroup label="ANTIGUO TESTAMENTO">
                  {bibleBooks.filter(b => b.testament === 'AT').map(book => (
                    <option key={book.abbr} value={book.abbr}>
                      {book.name}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="NUEVO TESTAMENTO">
                  {bibleBooks.filter(b => b.testament === 'NT').map(book => (
                    <option key={book.abbr} value={book.abbr}>
                      {book.name}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            {/* Chapter selector */}
            {selectedBook && (
              <div className="mb-3">
                <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-1 block">
                  Capítulo
                </label>
                <select
                  value={selectedChapter}
                  onChange={e => handleChapterChange(Number(e.target.value))}
                  className="input-field text-sm w-full"
                >
                  <option value="0">Seleccionar capítulo...</option>
                  {Array.from(
                    { length: bibleBooks.find(b => b.abbr === selectedBook)?.chaptersCount || 0 },
                    (_, i) => i + 1
                  ).map(ch => (
                    <option key={ch} value={ch}>
                      Capítulo {ch}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Verse range */}
            {selectedChapter > 0 && maxVerses > 0 && (
              <>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-1 block">
                      Desde versículo
                    </label>
                    <select
                      value={verseFrom}
                      onChange={e => handleVerseChange(Number(e.target.value), verseTo)}
                      className="input-field text-sm w-full"
                    >
                      <option value="0">--</option>
                      {Array.from({ length: maxVerses }, (_, i) => i + 1).map(v => (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-1 block">
                      Hasta versículo
                    </label>
                    <select
                      value={verseTo}
                      onChange={e => handleVerseChange(verseFrom, Number(e.target.value))}
                      className="input-field text-sm w-full"
                      disabled={verseFrom === 0}
                    >
                      <option value="0">--</option>
                      {Array.from({ length: maxVerses }, (_, i) => i + 1)
                        .filter(v => v >= verseFrom)
                        .map(v => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Preview */}
                {versesPreview.length > 0 && (
                  <div className="mb-3 p-3 rounded-2xl bg-crema-100 dark:bg-oscuro-bg max-h-48 overflow-y-auto">
                    <p className="text-xs font-semibold text-dorado mb-2">Vista previa:</p>
                    {versesPreview.map((verse, i) => (
                      <p key={i} className="text-xs text-cafe-dark dark:text-crema-200 leading-relaxed mb-1">
                        {verse}
                      </p>
                    ))}
                  </div>
                )}

                <button
                  onClick={handleStartLectioDivina}
                  disabled={!verseFrom || !verseTo}
                  className="btn-primary w-full"
                >
                  Generar Lectio Divina
                </button>
              </>
            )}
                </div>
              )}
            </div>
          ))}
        </div>

        <BugReportLink />

        <div className="pb-28" />

      </div>

      {/* About Modal */}
      {showAbout && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={() => setShowAbout(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-md bg-crema dark:bg-oscuro-bg rounded-3xl px-6 py-6 shadow-2xl animate-fade-in"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-dorado/15 flex items-center justify-center text-dorado">
                <Icon name="sparkles" size={20} />
              </div>
              <h2 className="font-serif font-bold text-cafe-dark dark:text-crema-200 text-xl">
                Acerca de Maná
              </h2>
            </div>

            <div className="space-y-3 text-sm text-cafe-dark dark:text-crema-200 leading-relaxed mb-5">
              <p>
                <strong>Maná</strong> es tu compañero espiritual diario. Combina la Biblia católica completa
                con las lecturas litúrgicas diarias, disponibles <strong className="text-dorado">100% offline</strong>.
              </p>
              <p>
                Incorpora inteligencia artificial para generar <em>Lectios Divinas</em> personalizadas,
                recomendarte pasajes bíblicos según tu momento espiritual, y conectarte con santos que
                resuenen con tu vida.
              </p>
              <p>
                Personalizá la experiencia desde <strong>Ajustes</strong>: elegí colores, tamaño de letra,
                y configurá notificaciones para acompañarte en tu jornada de fe.
              </p>
            </div>

            <button
              onClick={() => setShowAbout(false)}
              className="btn-secondary w-full"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Lectio Divina Modal */}
      {showLectioModal && (
        <LectioModal
          book={selectedBook}
          chapter={selectedChapter}
          verseFrom={verseFrom}
          verseTo={verseTo}
          onClose={() => setShowLectioModal(false)}
        />
      )}

      {/* Recommendation Modal */}
      {recommendation && (
        <div className="fixed inset-0 z-[60] flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setRecommendation(null)} />
          <div className="relative bg-crema dark:bg-oscuro-bg rounded-t-3xl px-5 pt-5 pb-8
                          max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl">
            <div className="w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />

            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200">
                Pasaje recomendado
              </h2>
              <button onClick={() => setRecommendation(null)} className="text-cafe-light dark:text-crema-300 text-sm py-1 px-2">
                cerrar ✕
              </button>
            </div>

            <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed mb-4">
              {recommendation.mensaje}
            </p>

            <div className="rounded-2xl bg-dorado/10 dark:bg-dorado/15 border border-dorado/30 p-5 mb-5">
              <p className="text-xs font-semibold text-dorado uppercase tracking-wider mb-3">
                {recommendation.libroNombre} {recommendation.capitulo}:{recommendation.versiculo}
              </p>
              <p className="font-serif text-lg text-cafe-dark dark:text-crema-200 leading-relaxed">
                «{recommendation.textoVersiculo}»
              </p>
            </div>

            <button
              onClick={handleGoToPassage}
              className="btn-primary w-full flex items-center justify-center gap-2 mb-2"
            >
              <span>📖</span>
              <span>Leer en contexto</span>
            </button>

            <button
              onClick={() => setRecommendation(null)}
              className="w-full text-center text-sm text-cafe-light dark:text-crema-300 py-2
                         active:scale-[0.98] transition-all"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
