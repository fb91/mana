import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'

export default function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()

  const sideClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 px-6 py-2.5 text-xs font-medium transition-colors duration-150
     ${isActive ? 'text-dorado' : 'text-cafe-light dark:text-crema-300 hover:text-dorado'}`

  function handleLecturasClick() {
    if (location.pathname === '/lecturas-del-dia') {
      // Already on the page — signal LiturgiaPage to jump back to today
      navigate('/lecturas-del-dia', { replace: true, state: { goToToday: Date.now() } })
    } else {
      navigate('/lecturas-del-dia')
    }
  }

  const lecturasActive = location.pathname === '/lecturas-del-dia'

  return (
    <nav className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] left-1/2 -translate-x-1/2
                    w-[calc(100%-1.5rem)] sm:max-w-[calc(28rem-1.5rem)] z-50
                    bg-white/75 dark:bg-oscuro-surface/80 backdrop-blur-md
                    rounded-2xl shadow-lg shadow-black/10
                    border border-white/60 dark:border-white/10">
      <div className="flex items-end justify-around px-4 pt-2 pb-2.5">

        {/* Izquierda: Inicio */}
        <NavLink to="/inicio" className={sideClass}>
          <Icon name="home" size={22} />
          <span className="leading-none">Inicio</span>
        </NavLink>

        {/* Centro: Lecturas del día (elevado) */}
        <button onClick={handleLecturasClick} className="flex flex-col items-center gap-1 -mt-6">
          <div className={[
            'w-14 h-14 rounded-2xl flex flex-col items-center justify-center',
            'transition-all duration-150',
            lecturasActive
              ? 'bg-dorado-dark shadow-xl shadow-dorado/50 border-2 border-dorado/80'
              : 'bg-dorado shadow-lg shadow-dorado/40 border-2 border-dorado/60',
          ].join(' ')}>
            <Icon name="cross" size={20} className="text-white" />
          </div>
          <span className={`text-[10px] font-semibold leading-tight text-center ${lecturasActive ? 'text-dorado' : 'text-cafe-light dark:text-crema-300'}`}>
            Lecturas
          </span>
        </button>

        {/* Derecha: Ajustes */}
        <NavLink to="/ajustes" className={sideClass}>
          <Icon name="cog" size={22} />
          <span className="leading-none">Ajustes</span>
        </NavLink>

      </div>
    </nav>
  )
}
