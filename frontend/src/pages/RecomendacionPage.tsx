import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { api, BibliaRecomendacion } from '../services/api'
import { getBibleVerse } from '../lib/bible'
import { BugReportLink } from '../components/BugReportButton'

const PRIMARY_EMOTIONS = [
  'Alegre',
  'Triste',
  'Ansioso',
  'Confiado',
  'Agradecido',
  'Confundido',
]

const SECONDARY_EMOTIONS = [
  'Solo',
  'Esperanzado',
  'Pleno',
  'Desanimado',
  'Vacío',
  'Fortalecido',
  'Amado',
  'Acompañado',
  'Cansado',
  'Culpable',
  'Perdido',
  'Enojado',
]

export default function RecomendacionPage() {
  const navigate = useNavigate()
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [showMoreEmotions, setShowMoreEmotions] = useState(false)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BibliaRecomendacion | null>(null)
  const [error, setError] = useState('')

  function handleEmotionClick(emotion: string) {
    setSelectedEmotions(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    )
  }

  async function handleSubmit() {
    if (selectedEmotions.length === 0 || loading) return
    const feeling = [...selectedEmotions].sort((a, b) => a.localeCompare(b)).map(e => e.toLowerCase()).join(',')
    setLoading(true)
    setError('')
    try {
      const rec = await api.getBibliaRecomendacion(feeling)
      const verseText = await getBibleVerse(rec.libro, rec.capitulo, rec.versiculo)
      setResult({ ...rec, textoVersiculo: verseText ?? '' })
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_INPUT') {
        setError('Seleccioná al menos un estado de ánimo para buscarte un pasaje que te acompañe.')
      } else {
        setError('No se pudo obtener una recomendación. Intentá de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  function handleGoToPassage() {
    if (!result) return
    navigate(`/biblia/${result.libro}/${result.capitulo}?verso=${result.versiculo}`)
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        icon={<Icon name="sparkles" size={18} />}
        title="Recomendación espiritual"
        subtitle="Un pasaje para este momento"
      />

      <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 animate-fade-in">
        <div className="max-w-sm mx-auto space-y-5">

          {!result ? (
            <>
              <p className="text-sm text-cafe-light dark:text-crema-300 leading-relaxed">
                Seleccioná cómo te sentís. Podés elegir más de uno.
                Vamos a buscarte un pasaje bíblico que te acompañe.
              </p>

              {/* Emotion pills - primary */}
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

              {/* Accordion: ver más */}
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

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              {/* CTA / Loading animation */}
              {loading ? (
                <div className="flex flex-col items-center gap-3 py-6 animate-fade-in">
                  <div className="relative w-14 h-14">
                    <div className="absolute inset-0 rounded-full border-2 border-dorado/20" />
                    <div className="absolute inset-0 rounded-full border-2 border-dorado border-t-transparent animate-spin" />
                    <span className="absolute inset-0 flex items-center justify-center text-xl animate-pulse-soft">✨</span>
                  </div>
                  <p className="text-sm text-cafe-light dark:text-crema-300 animate-pulse-soft">
                    Buscando tu pasaje...
                  </p>
                </div>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={selectedEmotions.length === 0}
                  className="btn-primary w-full"
                >
                  Recibir recomendación
                </button>
              )}

              {/* Disclaimer */}
              <p className="text-[11px] text-cafe-light/70 dark:text-crema-400/70 text-center leading-snug">
                El pasaje sugerido está tomado de la Biblia del Vaticano.
                La selección es orientativa y generada por IA.
              </p>
            </>
          ) : (
            <div className="space-y-5 animate-fade-in">

              {/* Mensaje de la IA */}
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">
                {result.mensaje}
              </p>

              {/* Versículo */}
              <div className="bg-dorado/10 dark:bg-dorado/15 border border-dorado/30 rounded-2xl p-5 space-y-3">
                <p className="text-cafe-light dark:text-crema-300 text-xs font-semibold uppercase tracking-wider">
                  {result.libroNombre} {result.capitulo}:{result.versiculo}
                </p>
                <p className="font-serif text-lg text-cafe-dark dark:text-crema-200 leading-relaxed">
                  "{result.textoVersiculo}"
                </p>
              </div>

              {/* CTA: ir al pasaje */}
              <button
                onClick={handleGoToPassage}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <span>📖</span>
                <span>Ir al pasaje y seguir leyendo</span>
              </button>

              <button
                onClick={() => { setResult(null); setSelectedEmotions([]); setShowMoreEmotions(false) }}
                className="btn-secondary w-full text-sm"
              >
                Pedir otra recomendación
              </button>

            </div>
          )}
        </div>

        <BugReportLink />

      </div>
    </div>
  )
}
