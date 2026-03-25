import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import Icon, { IconName } from './Icon'

interface Quote {
  text: string
  cite: string
  abbr: string
  chapter: number
  verse: number
}

const QUOTES: Quote[] = [
  { text: '«Busquen y encontrarán.»',         cite: 'Mt 7,7',     abbr: 'Mt',  chapter: 7,  verse: 7  },
  { text: '«Mis ovejas escuchan mi voz.»',    cite: 'Jn 10,27',   abbr: 'Jn',  chapter: 10, verse: 27 },
  { text: '«No teman.»',                       cite: 'Mt 14,27',   abbr: 'Mt',  chapter: 14, verse: 27 },
  { text: '«Yo estaré siempre con ustedes.»', cite: 'Mt 28,20',   abbr: 'Mt',  chapter: 28, verse: 20 },
  { text: '«Les doy mi paz.»',                cite: 'Jn 14,27',   abbr: 'Jn',  chapter: 14, verse: 27 },
  { text: '«Permanezcan despiertos y oren.»', cite: 'Mt 26,41',   abbr: 'Mt',  chapter: 26, verse: 41 },
  { text: '«El Señor está cerca.»',           cite: 'Flp 4,5',    abbr: 'Flp', chapter: 4,  verse: 5  },
  { text: '«Oren sin cesar.»',                cite: '1 Tes 5,17', abbr: '1Tes',chapter: 5,  verse: 17 },
  { text: '«Confía en el Señor.»',            cite: 'Prov 3,5',   abbr: 'Prov',chapter: 3,  verse: 5  },
]

const NAV_ITEMS: { path: string; icon: IconName; label: string }[] = [
  { path: '/inicio',          icon: 'home',      label: 'Inicio'   },
  { path: '/lecturas-del-dia',icon: 'cross',     label: 'Evangelio'},
  { path: '/ajustes',         icon: 'cog',       label: 'Ajustes'  },
]

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [quote] = useState<Quote>(() => QUOTES[Math.floor(Math.random() * QUOTES.length)])

  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 flex-col
                      bg-crema dark:bg-oscuro-bg border-r border-crema-200 dark:border-oscuro-border z-40">

      {/* Logo + cita */}
      <div className="px-6 pt-8 pb-6 border-b border-crema-200 dark:border-oscuro-border">
        <h1 className="font-serif text-4xl font-semibold text-cafe-dark dark:text-crema-200 leading-none mb-3">
          Maná
        </h1>
        <p className="text-sm text-cafe-light dark:text-crema-300 leading-snug italic">
          {quote.text}
          <button
            onClick={() => navigate(`/biblia/${quote.abbr}/${quote.chapter}?verso=${quote.verse}`)}
            className="not-italic font-semibold block mt-0.5 text-xs text-dorado hover:underline active:opacity-70"
          >
            — {quote.cite}
          </button>
        </p>
      </div>

      {/* Navegación */}
      <nav className="flex-1 px-3 py-5 space-y-1">
        {NAV_ITEMS.map(item => {
          const isActive = location.pathname === item.path
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={[
                'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-left transition-all duration-150',
                isActive
                  ? 'bg-dorado/15 text-dorado font-semibold'
                  : 'text-cafe-dark dark:text-crema-200 hover:bg-crema-100 dark:hover:bg-oscuro-surface',
              ].join(' ')}
            >
              <Icon name={item.icon} size={20} />
              <span className="text-sm font-medium">{item.label}</span>
            </button>
          )
        })}
      </nav>
    </aside>
  )
}
