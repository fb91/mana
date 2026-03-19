import { SantoSugerido } from '../services/api'

interface Props {
  santo: SantoSugerido
  index: number
}

export default function SantoCard({ santo, index }: Props) {
  return (
    <div className="card overflow-hidden animate-fade-in" style={{ animationDelay: `${index * 100}ms` }}>

      {/* Header */}
      <div className="bg-gradient-to-r from-dorado/10 to-transparent px-4 pt-4 pb-3 border-b border-crema-100 dark:border-oscuro-border">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-serif text-base font-semibold text-cafe-dark dark:text-crema-100 leading-snug">
              {santo.nombre}
            </h3>
            <span className="text-xs text-cafe-light dark:text-crema-400 mt-0.5 inline-block">
              {santo.epoca}
            </span>
          </div>
          <span className="text-2xl flex-shrink-0">✨</span>
        </div>
      </div>

      <div className="px-4 py-3 space-y-3">

        {/* Conexión personalizada */}
        <div className="flex gap-2.5 items-start">
          <span className="text-dorado text-sm flex-shrink-0 mt-0.5">🔗</span>
          <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">
            {santo.conexion}
          </p>
        </div>

        {/* Biografía */}
        <div className="flex gap-2.5 items-start">
          <span className="text-sm flex-shrink-0 mt-0.5">📖</span>
          <p className="text-sm text-cafe-light dark:text-crema-300 leading-relaxed">
            {santo.bio}
          </p>
        </div>

        {/* Frase característica */}
        <blockquote className="border-l-2 border-dorado/50 pl-3 py-0.5">
          <p className="text-sm italic text-cafe-dark dark:text-crema-200 leading-relaxed">
            "{santo.frase}"
          </p>
        </blockquote>

        {/* Cuándo invocarlo */}
        <div className="bg-crema-50 dark:bg-oscuro-surface rounded-lg px-3 py-2 flex gap-2 items-start">
          <span className="text-sm flex-shrink-0">🙏</span>
          <p className="text-xs text-cafe-light dark:text-crema-300 leading-relaxed">
            <span className="font-semibold text-cafe-dark dark:text-crema-200">Invocalo cuando: </span>
            {santo.cuandoInvocarlo}
          </p>
        </div>

      </div>
    </div>
  )
}
