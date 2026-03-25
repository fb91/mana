import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon from './Icon'

const DESKTOP_ITEMS = [
  { label: 'Evangelio', path: '/lecturas-del-dia' },
  { label: 'Biblia', path: '/biblia' },
  { label: 'Novenas', path: '/novenas' },
  { label: 'Examen', path: '/examen' },
  { label: 'Ajustes', path: '/ajustes' },
]

const MOBILE_ITEMS = [
  { label: 'Evangelio del día', path: '/lecturas-del-dia' },
  { label: 'Biblia', path: '/biblia' },
  { label: 'Novenas', path: '/novenas' },
  { label: 'Examen de conciencia', path: '/examen' },
  { label: 'Santo del día', path: '/santo' },
  { label: 'Lectio Divina', path: '/lectio' },
  { label: 'Ajustes', path: '/ajustes' },
]

function isPathActive(location: { pathname: string }, path: string): boolean {
  if (path === '/lecturas-del-dia') return location.pathname === path
  return location.pathname === path || location.pathname.startsWith(path + '/')
}

export default function TopNav() {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  function handleNav(path: string) {
    navigate(path)
    setMenuOpen(false)
  }

  return (
    <>
      <header
        className="sticky top-0 z-50
                   bg-crema/85 dark:bg-oscuro-bg/85 backdrop-blur-md
                   border-b border-crema-200/60 dark:border-oscuro-border/60"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">

          {/* Logo */}
          <button
            onClick={() => handleNav('/lecturas-del-dia')}
            className="flex items-center gap-2 text-dorado hover:opacity-80 transition-opacity shrink-0"
            aria-label="Ir al inicio"
          >
            <Icon name="cross" size={17} />
            <span className="font-serif font-semibold text-lg leading-none">Maná</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-0.5">
            {DESKTOP_ITEMS.map(item => {
              const active = isPathActive(location, item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors duration-150
                    ${active
                      ? 'text-dorado bg-dorado/10'
                      : 'text-cafe-dark dark:text-crema-300 hover:text-dorado hover:bg-dorado/8'
                    }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl
                       text-cafe-dark dark:text-crema-200
                       hover:bg-crema-200 dark:hover:bg-oscuro-surface transition-colors"
            aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            <Icon name={menuOpen ? 'x-mark' : 'menu'} size={22} />
          </button>

        </div>
      </header>

      {/* Mobile menu overlay */}
      {menuOpen && (
        <div
          className="md:hidden fixed inset-0 top-14 z-40
                     bg-crema/95 dark:bg-oscuro-bg/95 backdrop-blur-sm"
          onClick={() => setMenuOpen(false)}
        >
          <nav
            className="flex flex-col px-4 pt-4 pb-8 gap-1"
            onClick={e => e.stopPropagation()}
          >
            {MOBILE_ITEMS.map(item => {
              const active = isPathActive(location, item.path)
              return (
                <button
                  key={item.path}
                  onClick={() => handleNav(item.path)}
                  className={`w-full text-left px-5 py-4 rounded-2xl text-base font-medium transition-colors duration-150
                    ${active
                      ? 'text-dorado bg-dorado/10'
                      : 'text-cafe-dark dark:text-crema-200 hover:bg-crema-200 dark:hover:bg-oscuro-surface active:scale-[0.98]'
                    }`}
                >
                  {item.label}
                </button>
              )
            })}
          </nav>
        </div>
      )}
    </>
  )
}
