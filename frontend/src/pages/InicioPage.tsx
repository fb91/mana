import { useNavigate } from 'react-router-dom'
import Icon, { IconName } from '../components/Icon'

interface Tool {
  icon: IconName
  title: string
  description: string
  to: string
  soon?: boolean
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
  },
  {
    icon: 'clipboard',
    title: 'Examen de conciencia',
    description: 'Preparate para la confesión con preguntas adaptadas a tu perfil. Descargá tu examen.',
    to: '/examen',
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
            "Yo soy el pan de vida. El que viene a mí jamás tendrá hambre; el que cree en mí jamás tendrá sed."
            <span className="not-italic font-semibold block mt-0.5 text-dorado">— Jn 6, 35</span>
          </p>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-5 animate-fade-in">

        <div className="grid grid-cols-1 gap-3 pb-4">
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
