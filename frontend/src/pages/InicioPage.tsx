import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon, { IconName } from '../components/Icon'
import { useAppStore } from '../store/useAppStore'

const IS_DEV = import.meta.env.DEV

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

const tools: Tool[] = [
  {
    icon: 'book-open',
    title: 'La Biblia',
    description: 'Leé cualquier libro y capítulo. Hacé Lectio Divina sobre los pasajes que te toquen.',
    to: '/biblia',
  },
  {
    icon: 'sparkles',
    title: 'Recomendación espiritual',
    description: 'Contanos cómo te sentís y te sugerimos un pasaje bíblico que puede acompañarte.',
    to: '/recomendacion',
  },
  {
    icon: 'star',
    title: '¿Con qué santo conectás?',
    description: 'Descubrí los santos de la Iglesia que mejor conectan con tu vida y espiritualidad.',
    to: '/santo',
  },
  {
    icon: 'beads',
    title: 'Novenas',
    description: 'Rezá novenas con recordatorios diarios. Acompañarte con la intercesión de los santos.',
    to: '/novenas',
    soon: !IS_DEV,
  },
  {
    icon: 'clipboard',
    title: 'Examen de conciencia',
    description: 'Preparate para la confesión con preguntas adaptadas a tu perfil. Descargá tu examen.',
    to: '/examen',
    soon: !IS_DEV,
  },
  {
    icon: 'archive',
    title: 'Devocionario',
    description: 'Oraciones tradicionales, jaculatorias y devociones para cada momento del día.',
    to: '',
    soon: true,
  },
]

export default function InicioPage() {
  const navigate = useNavigate()
  const lastBiblePath = useAppStore(s => s.lastBiblePath)
  const [quote] = useState<Quote>(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  return (
    <div className="flex flex-col h-screen">

      {/* Header personalizado */}
      <header className="sticky top-0 z-10 bg-crema/95 dark:bg-oscuro-bg/95 backdrop-blur-sm
                          border-b border-crema-200 dark:border-oscuro-border px-5 py-4">
        <div className="flex items-center gap-3">
          <h1 className="font-serif text-2xl font-semibold text-cafe-dark dark:text-crema-200 leading-none">
            Maná
          </h1>
          <div className="w-px h-8 bg-crema-300 dark:bg-oscuro-border" />
          <p className="text-xs text-cafe-light dark:text-crema-300 leading-snug max-w-[220px] italic">
            {quote.text}
            <button
              onClick={() => navigate(`/biblia/${quote.abbr}/${quote.chapter}?verso=${quote.verse}`)}
              className="not-italic font-semibold block mt-0.5 text-dorado hover:underline active:opacity-70"
            >
              — {quote.cite}
            </button>
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 animate-fade-in">

        {/* Descripción de la app */}
        <div className="mb-5 rounded-3xl bg-dorado/8 dark:bg-dorado/12 border border-dorado/20
                        px-5 py-4 flex gap-4 items-start">
          <div className="mt-0.5 w-8 h-8 rounded-xl bg-dorado/15 flex items-center justify-center flex-shrink-0 text-dorado">
            <Icon name="sparkles" size={16} />
          </div>
          <div>
            <h2 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight mb-1.5">
              Tu espacio de espiritualidad
            </h2>
            <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
              Maná reúne herramientas para alimentar tu fe cada día: la Biblia católica completa,
              meditación, lecturas litúrgicas y más. La aplicación está creciendo —
              pronto habrá nuevas secciones para acompañarte aún más.
            </p>
          </div>
        </div>

        {/* Continuar leyendo */}
        {lastBiblePath && (
          <button
            onClick={() => navigate(lastBiblePath)}
            className="w-full card text-left flex items-center gap-4 mb-4
                       hover:border-dorado/50 hover:shadow-md active:scale-[0.98]
                       transition-all duration-200 border-dorado/30 bg-dorado/5 dark:bg-dorado/10"
          >
            <div className="w-12 h-12 rounded-2xl bg-dorado/15 dark:bg-dorado/20 flex items-center justify-center flex-shrink-0 text-dorado">
              <Icon name="book-open" size={22} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-dorado mb-0.5">
                Continuar leyendo
              </p>
              <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight truncate">
                {formatBiblePath(lastBiblePath)}
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="text-dorado/60 flex-shrink-0" />
          </button>
        )}

        <div className="grid grid-cols-1 gap-3 pb-28">
          {tools.map((tool) => (
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

      </div>
    </div>
  )
}
