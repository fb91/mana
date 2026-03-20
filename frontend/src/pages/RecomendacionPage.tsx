import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { api, BibliaRecomendacion } from '../services/api'
import { getBibleVerse } from '../lib/bible'
import { BugReportLink } from '../components/BugReportButton'

export default function RecomendacionPage() {
  const navigate = useNavigate()
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BibliaRecomendacion | null>(null)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!text.trim() || loading) return
    setLoading(true)
    setError('')
    try {
      const rec = await api.getBibliaRecomendacion(text.trim())
      // Resolve verse text from locally cached bible JSON
      const verseText = await getBibleVerse(rec.libro, rec.capitulo, rec.versiculo)
      setResult({ ...rec, textoVersiculo: verseText ?? '' })
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_INPUT') {
        setError('Contanos algo sobre cómo te sentís o qué te está pasando para poder buscarte un pasaje que te acompañe.')
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
    <div className="flex flex-col h-screen">
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
                Contanos brevemente cómo te sentís o qué te preocupa. La IA buscará un pasaje
                bíblico que pueda acompañarte en este momento.
              </p>

              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Estoy ansioso por una prueba que se me viene..."
                rows={4}
                className="input-field text-sm w-full resize-none"
                autoFocus
              />

              {error && (
                <p className="text-xs text-red-500">{error}</p>
              )}

              <button
                onClick={handleSubmit}
                disabled={!text.trim() || loading}
                className="btn-primary w-full"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-pulse-soft">✨</span>
                    Buscando pasaje...
                  </span>
                ) : (
                  'Recibir recomendación'
                )}
              </button>

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
                onClick={() => { setResult(null); setText('') }}
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
