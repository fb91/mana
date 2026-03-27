import type { BibliaRecomendacion } from '../services/api'

interface Props {
  recommendation: BibliaRecomendacion
  onClose: () => void
  onGoToPassage: () => void
}

export default function RecommendationModal({ recommendation, onClose, onGoToPassage }: Props) {
  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:items-center lg:justify-center lg:p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-crema dark:bg-oscuro-bg rounded-t-3xl lg:rounded-3xl px-5 pt-5 pb-8
                      w-full lg:max-w-lg max-h-[85vh] overflow-y-auto animate-slide-up shadow-2xl">
        <div className="lg:hidden w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />

        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200">
            Pasaje recomendado
          </h2>
          <button onClick={onClose} className="text-cafe-light dark:text-crema-300 text-sm py-1 px-2">
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
          onClick={onGoToPassage}
          className="btn-primary w-full flex items-center justify-center gap-2 mb-2"
        >
          <span>📖</span>
          <span>Leer en contexto</span>
        </button>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-cafe-light dark:text-crema-300 py-2
                     active:scale-[0.98] transition-all"
        >
          Cerrar
        </button>
      </div>
    </div>
  )
}
