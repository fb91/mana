import { NavLink } from 'react-router-dom'
import Icon from './Icon'

export default function BottomNav() {
  const sideClass = ({ isActive }: { isActive: boolean }) =>
    `flex flex-col items-center justify-center gap-0.5 px-6 py-3 text-xs font-medium transition-colors duration-150
     ${isActive ? 'text-dorado' : 'text-cafe-light dark:text-crema-300 hover:text-dorado'}`

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50
                    bg-white/95 dark:bg-oscuro-surface/95 backdrop-blur-sm
                    border-t border-crema-200 dark:border-oscuro-border
                    pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-end justify-around px-4 pt-1 pb-2">

        {/* Izquierda: Inicio */}
        <NavLink to="/inicio" className={sideClass}>
          <Icon name="home" size={22} />
          <span className="leading-none">Inicio</span>
        </NavLink>

        {/* Centro: Evangelio del día (elevado) */}
        <NavLink to="/liturgia" className="flex flex-col items-center -mt-5">
          {({ isActive }) => (
            <>
              <div className={[
                'w-14 h-14 rounded-2xl flex flex-col items-center justify-center',
                'shadow-lg border-2 transition-all duration-150',
                isActive
                  ? 'bg-dorado-dark border-dorado-dark shadow-dorado/40'
                  : 'bg-dorado border-dorado/80 shadow-dorado/30',
              ].join(' ')}>
                <Icon name="cross" size={20} className="text-white" />
                <span className="text-[9px] font-bold text-white mt-0.5 leading-tight text-center">
                  Evangelio
                </span>
              </div>
            </>
          )}
        </NavLink>

        {/* Derecha: Ajustes */}
        <NavLink to="/ajustes" className={sideClass}>
          <Icon name="cog" size={22} />
          <span className="leading-none">Ajustes</span>
        </NavLink>

      </div>
    </nav>
  )
}
