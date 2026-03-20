import { useState, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import AxisRater from '../components/AxisRater'
import SantoCard from '../components/SantoCard'
import { api, SantoSugerido } from '../services/api'
import { quickProfileAxes, extendedProfileAxes, intentOptions } from '../data/santoAxes'
import { BugReportLink } from '../components/BugReportButton'

type Phase = 'quick_rating' | 'resultado' | 'extended_rating'

export default function SantoPage() {
  const [phase, setPhase] = useState<Phase>('quick_rating')
  const [quickScores, setQuickScores] = useState<Record<string, number>>({})
  const [extendedScores, setExtendedScores] = useState<Record<string, number>>({})
  const [intent, setIntent] = useState<string | null>(null)
  const [santos, setSantos] = useState<SantoSugerido[]>([])
  const [introText, setIntroText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const quickComplete = quickProfileAxes.every(a => quickScores[a.id] !== undefined)
  const extendedComplete = extendedProfileAxes.every(a => extendedScores[a.id] !== undefined)

  const fetchSantos = useCallback(async (extended = false) => {
    setLoading(true)
    setError('')
    try {
      const res = await api.santo(
        quickScores,
        extended ? extendedScores : {},
        intent ?? undefined,
      )
      if (res.santos && res.santos.length > 0) {
        setSantos(res.santos)
        setIntroText(res.response)
      }
      setPhase('resultado')
    } catch {
      setError('Hubo un error al conectar. Por favor intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }, [quickScores, extendedScores, intent])

  const handleReset = useCallback(() => {
    setPhase('quick_rating')
    setQuickScores({})
    setExtendedScores({})
    setIntent(null)
    setSantos([])
    setIntroText('')
    setError('')
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="star" size={18} />}
        title="¿Con qué santo conectás?"
        subtitle="Descubrí tu compañero en la fe"
        onReset={phase !== 'quick_rating' ? handleReset : undefined}
      />

      {/* ── QUICK RATING ── */}
      {phase === 'quick_rating' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 animate-fade-in">
          {/* Brief explanation */}
          <div className="mb-5 rounded-2xl bg-dorado/8 dark:bg-dorado/12 border border-dorado/20 px-4 py-3">
            <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">
              Respondé 5 preguntas sobre tu vida
              y te recomendamos los santos que mejor conectan con vos ahora mismo.
            </p>
          </div>

          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-4">
            Valorá cada aspecto de tu vida ahora mismo
          </p>

          <div className="space-y-3 mb-5">
            {quickProfileAxes.map(axis => (
              <AxisRater
                key={axis.id}
                axis={axis}
                value={quickScores[axis.id] ?? null}
                onChange={val => setQuickScores(prev => ({ ...prev, [axis.id]: val }))}
              />
            ))}
          </div>

          {/* Intent — opcional */}
          <div className="mb-5">
            <p className="text-xs text-cafe-light dark:text-crema-400 mb-2 font-medium">
              ¿Qué estás buscando principalmente? <span className="opacity-60">(opcional)</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {intentOptions.map(opt => (
                <button
                  key={opt}
                  onClick={() => setIntent(prev => prev === opt ? null : opt)}
                  className={[
                    'px-3 py-1.5 rounded-full text-xs border transition-all duration-150 active:scale-95',
                    intent === opt
                      ? 'bg-dorado text-white border-dorado shadow-sm'
                      : 'bg-white dark:bg-oscuro-card border-crema-200 dark:border-oscuro-border text-cafe-light dark:text-crema-300 hover:border-dorado/50',
                  ].join(' ')}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-3 text-center">{error}</p>
          )}

          <button
            onClick={() => fetchSantos(false)}
            disabled={!quickComplete || loading}
            className="btn-primary w-full mb-6"
          >
            {loading ? 'Buscando santos...' : 'Descubrir mis santos'}
          </button>

          <BugReportLink />

        </div>
      )}

      {/* ── RESULTADO ── */}
      {phase === 'resultado' && (
        <div className="flex-1 overflow-y-auto px-4 py-5 pb-28 animate-fade-in">

          {loading && (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <span className="text-4xl animate-pulse-soft">✨</span>
              <p className="text-cafe-light dark:text-crema-300 text-sm mt-3">
                Refinando la recomendación...
              </p>
            </div>
          )}

          {!loading && (
            <>
              {/* Intro */}
              {introText && (
                <div className="flex gap-3 items-start mb-5">
                  <span className="text-2xl flex-shrink-0 mt-0.5">✨</span>
                  <div className="bg-white dark:bg-oscuro-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-crema-100 dark:border-oscuro-border flex-1">
                    <p className="text-sm leading-relaxed text-cafe-dark dark:text-crema-200">
                      {introText}
                    </p>
                  </div>
                </div>
              )}

              {/* Cards */}
              <div className="space-y-4 mb-5">
                {santos.map((santo, i) => (
                  <SantoCard key={i} santo={santo} index={i} />
                ))}
              </div>

              {/* CTA refinamiento */}
              <div className="pb-6">
                <button
                  onClick={() => setPhase('extended_rating')}
                  className="w-full py-3 rounded-xl border border-dashed border-crema-300 dark:border-oscuro-border text-cafe-light dark:text-crema-400 text-sm hover:border-dorado/60 hover:text-dorado transition-all active:scale-[0.98]"
                >
                  ✦ Afinar la búsqueda con más preguntas
                </button>
              </div>
            </>
          )}

          <BugReportLink />

        </div>
      )}

      {/* ── EXTENDED RATING ── */}
      {phase === 'extended_rating' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 animate-fade-in">
          <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-1">
            Afinar la búsqueda
          </p>
          <p className="text-xs text-cafe-light dark:text-crema-400 mb-4">
            Estas preguntas adicionales mejoran la precisión de la recomendación.
          </p>

          <div className="space-y-3 mb-5">
            {extendedProfileAxes.map(axis => (
              <AxisRater
                key={axis.id}
                axis={axis}
                value={extendedScores[axis.id] ?? null}
                onChange={val => setExtendedScores(prev => ({ ...prev, [axis.id]: val }))}
              />
            ))}
          </div>

          {error && (
            <p className="text-sm text-red-500 mb-3 text-center">{error}</p>
          )}

          <div className="flex gap-3 mb-6">
            <button
              onClick={() => setPhase('resultado')}
              className="flex-1 py-3 rounded-xl border border-crema-200 dark:border-oscuro-border text-cafe-light dark:text-crema-400 text-sm hover:border-dorado/50 transition-all"
            >
              Volver
            </button>
            <button
              onClick={() => fetchSantos(true)}
              disabled={!extendedComplete || loading}
              className="flex-[2] btn-primary"
            >
              {loading ? 'Recalculando...' : 'Recalcular recomendación'}
            </button>
          </div>

          <BugReportLink />

        </div>
      )}
    </div>
  )
}
