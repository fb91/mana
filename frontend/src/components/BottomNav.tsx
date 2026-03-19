import { NavLink } from 'react-router-dom'

const tabs = [
  { to: '/biblia',   icon: '📖', label: 'Biblia' },
  { to: '/examen',   icon: '🙏', label: 'Examen' },
  { to: '/santo',    icon: '✨', label: 'Santo' },
  { to: '/novenas',  icon: '📿', label: 'Novenas' },
  { to: '/qa',       icon: '❓', label: 'Q&A' },
  { to: '/liturgia', icon: '🗓️', label: 'Liturgia' },
]

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50
                    bg-white/95 dark:bg-oscuro-surface/95 backdrop-blur-sm
                    border-t border-crema-200 dark:border-oscuro-border
                    pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-stretch overflow-x-auto scrollbar-hide">
        {tabs.map(({ to, icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center flex-1 min-w-[52px] py-2 px-1 gap-0.5
               text-xs font-medium transition-colors duration-150
               ${isActive
                 ? 'text-dorado'
                 : 'text-cafe-light dark:text-crema-300 hover:text-dorado'
               }`
            }
          >
            <span className="text-xl leading-none">{icon}</span>
            <span className="leading-none truncate">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
