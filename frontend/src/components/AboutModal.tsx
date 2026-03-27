import Icon from './Icon'

export default function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" onClick={onClose}>
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

        <button onClick={onClose} className="btn-secondary w-full">
          Cerrar
        </button>
      </div>
    </div>
  )
}
