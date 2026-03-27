import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Icon, { IconName } from '../components/Icon'
import { useAppStore } from '../store/useAppStore'
import { BugReportLink } from '../components/BugReportButton'
import IOSInstallModal, { dismissIOSInstallPrompt } from '../components/IOSInstallModal'
import PrayerMarquee from '../components/PrayerMarquee'
import { usePWAInstall } from '../hooks/usePWAInstall'
import { getLiturgicalContext, buildLiturgicalLabel } from '../lib/liturgicalCalendar'
import LectioModal from '../components/LectioModal'
import AboutModal from '../components/AboutModal'
import RecommendationModal from '../components/RecommendationModal'
import LectioSelector from '../components/LectioSelector'
import QuickAccessCards from '../components/QuickAccessCards'
import { useEmotionRecommender } from '../hooks/useEmotionRecommender'
import { useLectioSelector } from '../hooks/useLectioSelector'

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

const PRIMARY_EMOTIONS = ['Alegre', 'Triste', 'Ansioso', 'Confiado', 'Agradecido', 'Confundido']
const SECONDARY_EMOTIONS = ['Solo', 'Esperanzado', 'Pleno', 'Desanimado', 'Vacío', 'Fortalecido', 'Amado', 'Acompañado', 'Cansado', 'Culpable', 'Perdido', 'Enojado']

interface Tool {
  icon: IconName
  title: string
  description: string
  to: string
  soon?: boolean
}

const IS_PROD = import.meta.env.PROD

const recursos: Tool[] = [
  { icon: 'book-open', title: 'La Biblia',           description: 'Leé cualquier libro y capítulo. Hacé Lectio Divina sobre los pasajes que te toquen.', to: '/biblia' },
  { icon: 'beads',     title: 'Novenas',              description: 'Rezá novenas con recordatorios diarios. Acompañarte con la intercesión de los santos.', to: '/novenas' },
  { icon: 'clipboard', title: 'Examen de conciencia', description: 'Preparate para la confesión con preguntas adaptadas a tu perfil. Descargá tu examen.', to: '/examen', soon: IS_PROD },
  { icon: 'archive',   title: 'Devocionario',         description: 'Oraciones tradicionales, jaculatorias y devociones para cada momento del día.', to: '', soon: true },
]

const comunidad: Tool[] = [
  { icon: 'hands', title: 'Pedido de oración', description: 'Rezá por otros y pedí oraciones para vos o para alguien especial.', to: '/comunidad/pedido-oracion' },
]

const herramientas: Tool[] = [
  { icon: 'sparkles',  title: 'Asistente Espiritual',    description: 'Generá un plan personalizado de oración, reflexión y acción para N días con guía de IA.', to: '/asistente' },
  { icon: 'book-open', title: 'Lectio Divina',            description: 'Meditá profundamente sobre cualquier pasaje bíblico con guía de IA.', to: '#lectio' },
  { icon: 'star',      title: '¿Con qué santo conectás?', description: 'Descubrí los santos de la Iglesia que mejor conectan con tu vida y espiritualidad.', to: '/santo' },
]

export default function InicioPage() {
  const navigate = useNavigate()
  const lastBiblePath = useAppStore(s => s.lastBiblePath)
  const novenasProgreso = useAppStore(s => s.novenasProgreso)
  const novenaActiva = novenasProgreso.find(p => p.diasCompletados.length < 9) ?? null
  const diaSiguiente = novenaActiva ? (novenaActiva.diaActual ?? 0) + 1 : null
  const planEspiritual = useAppStore(s => s.planEspiritual)
  const planActivo =
    planEspiritual && planEspiritual.diasCompletados.length < planEspiritual.plan.duracionDias
      ? planEspiritual
      : null
  const diaPlanSiguiente = planActivo ? Math.min(planActivo.diaActual + 1, planActivo.plan.duracionDias) : null
  const [quote] = useState<Quote>(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  const liturgicalCtx = getLiturgicalContext(new Date())
  const liturgicalLabel = buildLiturgicalLabel(liturgicalCtx)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Buenos días' : hour < 20 ? 'Buenas tardes' : 'Buenas noches'

  const [showAbout, setShowAbout] = useState(false)

  // Install banner & modal (iOS + Android)
  const { state: installState, install: triggerAndroidInstall } = usePWAInstall()
  const [showIOSModal, setShowIOSModal] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const isIOS = installState === 'ios'
  const showInstallBanner = !installDismissed && (isIOS || installState === 'prompt')

  function handleInstallBannerClick() {
    if (isIOS) {
      setShowIOSModal(true)
    } else if (installState === 'prompt') {
      triggerAndroidInstall().then(() => setInstallDismissed(true))
    }
  }

  // Emotion & recommendation
  const {
    selectedEmotions, showMoreEmotions, setShowMoreEmotions,
    loadingRec, recommendation, setRecommendation,
    errorRec, handleEmotionClick, handleGetRecommendation,
  } = useEmotionRecommender()

  // Lectio Divina selector
  const [showLectioSelector, setShowLectioSelector] = useState(false)
  const [showLectioModal, setShowLectioModal] = useState(false)
  const {
    bibleBooks, selectedBook, selectedChapter, verseFrom, verseTo,
    versesPreview, maxVerses, handleBookChange, handleChapterChange, handleVerseChange,
  } = useLectioSelector()

  return (
    <div className="flex flex-col h-screen">

      {/* Header personalizado — solo mobile */}
      <header className="lg:hidden sticky top-0 z-10 bg-crema/95 dark:bg-oscuro-bg/95 backdrop-blur-sm
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

      <div className="flex-1 overflow-y-auto px-4 py-5 lg:px-8 lg:pt-0 lg:pb-8 animate-fade-in">

        {/* Header desktop */}
        <header className="hidden lg:flex items-start justify-between pt-8 pb-6">
          <div>
            <h1 className="font-serif text-3xl font-bold text-cafe-dark dark:text-crema-200 leading-tight">
              {greeting}
            </h1>
            <div className="flex items-center gap-3 mt-1.5 flex-wrap">
              <p className="text-sm text-cafe-light dark:text-crema-300 capitalize">
                {new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <span className="inline-flex items-center text-xs bg-dorado/10 text-dorado
                               px-2.5 py-1 rounded-full border border-dorado/20 font-medium">
                {liturgicalLabel}
              </span>
            </div>
          </div>
          <button
            onClick={() => setShowAbout(true)}
            className="w-9 h-9 rounded-full bg-dorado/10 hover:bg-dorado/20 active:scale-95 transition-all
                       flex items-center justify-center flex-shrink-0 mt-1"
            aria-label="Acerca de Maná"
          >
            <Icon name="info" size={18} className="text-dorado" />
          </button>
        </header>

        {/* Prayer requests marquee */}
        <div className="-mx-4 lg:-mx-8">
          <PrayerMarquee />
        </div>

        {/* Install banner (iOS + Android) */}
        {showInstallBanner && (
          <button
            onClick={handleInstallBannerClick}
            className="w-full mb-4 flex items-center gap-3 rounded-2xl px-4 py-3
                       bg-gradient-to-r from-dorado/15 to-dorado/5 border border-dorado/30
                       active:scale-[0.98] transition-all duration-200"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-dorado to-[#965519]
                            flex items-center justify-center flex-shrink-0 shadow-sm">
              <span className="text-xl font-serif font-bold text-crema-50">M</span>
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200 leading-tight">
                Instalá Maná como app
              </p>
              <p className="text-xs text-cafe-light dark:text-crema-300 leading-snug mt-0.5">
                Offline y a pantalla completa
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="text-dorado/60 flex-shrink-0" />
          </button>
        )}

        {/* ¿Cómo te sientes hoy? */}
        <div className="mb-6 rounded-3xl bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                        px-5 py-5 shadow-sm">
          <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 text-lg mb-3">
            ¿Cómo te sientes hoy?
          </h2>

          <div className="flex flex-wrap gap-2">
            {PRIMARY_EMOTIONS.map(emotion => (
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
          </div>

          <button
            onClick={() => setShowMoreEmotions(prev => !prev)}
            className="flex items-center gap-1.5 text-xs text-dorado font-medium py-2"
          >
            <span>{showMoreEmotions ? 'Ver menos' : 'Ver más'}</span>
            <Icon name={showMoreEmotions ? 'chevron-up' : 'chevron-down'} size={14} />
          </button>

          {showMoreEmotions && (
            <div className="flex flex-wrap gap-2 animate-fade-in">
              {SECONDARY_EMOTIONS.map(emotion => (
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
            </div>
          )}

          {loadingRec ? (
            <div className="flex flex-col items-center gap-3 py-4 animate-fade-in">
              <div className="relative w-12 h-12">
                <div className="absolute inset-0 rounded-full border-2 border-dorado/20" />
                <div className="absolute inset-0 rounded-full border-2 border-dorado border-t-transparent animate-spin" />
                <span className="absolute inset-0 flex items-center justify-center text-lg animate-pulse-soft">✨</span>
              </div>
              <p className="text-sm text-cafe-light dark:text-crema-300 animate-pulse-soft">
                Buscando tu pasaje...
              </p>
            </div>
          ) : (
            <button
              onClick={handleGetRecommendation}
              disabled={selectedEmotions.length === 0}
              className="btn-primary w-full mt-2"
            >
              Recomiéndame un pasaje
            </button>
          )}

          {errorRec && <p className="text-xs text-red-500 mt-3">{errorRec}</p>}
        </div>

        {/* Accesos rápidos */}
        <QuickAccessCards
          novenaActiva={novenaActiva}
          diaSiguiente={diaSiguiente}
          planActivo={planActivo}
          diaPlanSiguiente={diaPlanSiguiente}
          lastBiblePath={lastBiblePath}
        />

        {/* RECURSOS Section */}
        <div className="h-px bg-crema-200 dark:bg-oscuro-border my-6" />
        <h2 className="font-serif font-bold text-cafe-dark dark:text-crema-200 text-sm uppercase tracking-widest mb-4">
          RECURSOS
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
          {recursos.map((tool) => (
            <button
              key={tool.title}
              onClick={() => !tool.soon && navigate(tool.to)}
              disabled={tool.soon}
              className={[
                'card text-left flex items-start gap-4 transition-all duration-200',
                tool.soon ? 'opacity-60 cursor-default' : 'hover:border-dorado/50 hover:shadow-md active:scale-[0.98]',
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
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

              {tool.to === '#lectio' && showLectioSelector && (
                <LectioSelector
                  bibleBooks={bibleBooks}
                  selectedBook={selectedBook}
                  selectedChapter={selectedChapter}
                  verseFrom={verseFrom}
                  verseTo={verseTo}
                  versesPreview={versesPreview}
                  maxVerses={maxVerses}
                  onBookChange={handleBookChange}
                  onChapterChange={handleChapterChange}
                  onVerseChange={handleVerseChange}
                  onStart={() => setShowLectioModal(true)}
                />
              )}
            </div>
          ))}
        </div>

        {/* COMUNIDAD Section */}
        <div className="h-px bg-crema-200 dark:bg-oscuro-border my-6" />
        <h2 className="font-serif font-bold text-cafe-dark dark:text-crema-200 text-sm uppercase tracking-widest mb-4">
          COMUNIDAD
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-6">
          {comunidad.map((tool) => (
            <button
              key={tool.title}
              onClick={() => navigate(tool.to)}
              className="card text-left flex items-start gap-4 transition-all duration-200
                         hover:border-dorado/50 hover:shadow-md active:scale-[0.98]"
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
              <Icon name="chevron-right" size={18} className="text-dorado/50 flex-shrink-0 mt-0.5" />
            </button>
          ))}
        </div>

        <BugReportLink />

        <p className="text-center text-[11px] text-cafe-light dark:text-crema-500 mt-2">
          <Link to="/privacidad" className="hover:underline">
            Política de Privacidad
          </Link>
        </p>

        <div className="pb-28 lg:pb-10" />
      </div>

      {showAbout && <AboutModal onClose={() => setShowAbout(false)} />}

      {showLectioModal && (
        <LectioModal
          book={selectedBook}
          chapter={selectedChapter}
          verseFrom={verseFrom}
          verseTo={verseTo}
          onClose={() => setShowLectioModal(false)}
        />
      )}

      {recommendation && (
        <RecommendationModal
          recommendation={recommendation}
          onClose={() => setRecommendation(null)}
          onGoToPassage={() => navigate(`/biblia/${recommendation.libro}/${recommendation.capitulo}?verso=${recommendation.versiculo}`)}
        />
      )}

      {showIOSModal && (
        <IOSInstallModal
          show={showIOSModal}
          onClose={() => {
            setShowIOSModal(false)
            dismissIOSInstallPrompt()
            setInstallDismissed(true)
          }}
        />
      )}
    </div>
  )
}
