import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

function getTiempoLiturgico(): { nombre: string; color: string; emoji: string; descripcion: string } {
  const hoy = new Date()
  const mes = hoy.getMonth() + 1
  const dia = hoy.getDate()

  // Cálculo aproximado — para precisión exacta se necesita el algoritmo del calendario litúrgico
  // Navidad: 25/12 - 12/01
  if ((mes === 12 && dia >= 25) || (mes === 1 && dia <= 12)) {
    return { nombre: 'Tiempo de Navidad', color: 'text-amber-600', emoji: '⭐', descripcion: 'Celebramos el nacimiento de Nuestro Señor Jesucristo.' }
  }
  // Adviento: 4 domingos antes de Navidad (aprox. 27/11 - 24/12)
  if (mes === 12 && dia <= 24) {
    return { nombre: 'Adviento', color: 'text-purple-600', emoji: '🕯️', descripcion: 'Tiempo de espera y preparación para la venida del Señor.' }
  }
  if (mes === 11 && dia >= 27) {
    return { nombre: 'Adviento', color: 'text-purple-600', emoji: '🕯️', descripcion: 'Tiempo de espera y preparación para la venida del Señor.' }
  }
  // Cuaresma: 40 días antes de Pascua (variable, aprox. feb-abr)
  if ((mes === 2 && dia >= 14) || (mes === 3 && dia <= 30)) {
    return { nombre: 'Cuaresma', color: 'text-purple-800', emoji: '✝️', descripcion: 'Tiempo de penitencia, conversión y preparación para la Pascua.' }
  }
  // Pascua: 50 días (aprox. abr-jun)
  if ((mes === 4) || (mes === 5 && dia <= 20)) {
    return { nombre: 'Tiempo Pascual', color: 'text-amber-500', emoji: '🌅', descripcion: '¡Cristo ha resucitado! Tiempo de alegría y renovación bautismal.' }
  }

  return { nombre: 'Tiempo Ordinario', color: 'text-green-700', emoji: '🌿', descripcion: 'Tiempo de crecimiento en la fe y en el seguimiento de Jesús.' }
}

function getDiaSemana(): string {
  const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  return dias[new Date().getDay()]
}

function getFechaFormateada(): string {
  return new Date().toLocaleDateString('es-AR', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  })
}

export default function LiturgiaPage() {
  const tiempo = getTiempoLiturgico()
  const fechaFormateada = getFechaFormateada()

  return (
    <div className="flex flex-col h-screen">
      <PageHeader icon={<Icon name="cross" size={18} />} title="Liturgia del Día" subtitle={getDiaSemana()} />

      <div className="flex-1 overflow-y-auto px-4 py-5 space-y-4 animate-fade-in">

        {/* Fecha */}
        <div className="card text-center py-4">
          <p className="text-xs text-cafe-light dark:text-crema-300 capitalize">{fechaFormateada}</p>
        </div>

        {/* Tiempo litúrgico */}
        <div className="card text-center py-6">
          <span className="text-4xl">{tiempo.emoji}</span>
          <h2 className={`font-serif text-xl font-semibold mt-2 ${tiempo.color}`}>
            {tiempo.nombre}
          </h2>
          <p className="text-sm text-cafe-light dark:text-crema-300 mt-2 max-w-xs mx-auto">
            {tiempo.descripcion}
          </p>
        </div>

        {/* Lecturas del día — próximamente */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">📖</span>
            <h3 className="font-serif font-semibold text-cafe-dark dark:text-crema-200">
              Lecturas del Día
            </h3>
          </div>
          <div className="bg-crema-100 dark:bg-oscuro-bg rounded-xl p-4 text-center">
            <span className="text-2xl">🔜</span>
            <p className="text-sm text-cafe-light dark:text-crema-300 mt-2">
              Las lecturas del día están en desarrollo.
            </p>
            <p className="text-xs text-cafe-light/70 dark:text-crema-300/70 mt-1">
              Próximamente integradas con el leccionario oficial.
            </p>
          </div>
        </div>

        {/* Santo del día — próximamente */}
        <div className="card">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">✨</span>
            <h3 className="font-serif font-semibold text-cafe-dark dark:text-crema-200">
              Santo del Día
            </h3>
          </div>
          <div className="bg-crema-100 dark:bg-oscuro-bg rounded-xl p-4 text-center">
            <span className="text-2xl">🔜</span>
            <p className="text-sm text-cafe-light dark:text-crema-300 mt-2">
              El santoral diario está en desarrollo.
            </p>
          </div>
        </div>

        {/* Enlace a Vatican.va */}
        <div className="card bg-crema-100 dark:bg-oscuro-surface text-center py-4">
          <p className="text-xs text-cafe-light dark:text-crema-300 mb-3">
            Mientras tanto, podés leer las lecturas oficiales en:
          </p>
          <a
            href="https://www.vatican.va/news_services/liturgy/libretti/index.htm"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-sm"
          >
            Vatican.va — Lecturas del día
          </a>
        </div>
      </div>
    </div>
  )
}
