import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../store/useAdminStore'

export default function AdminDashboard() {
  const { logout, session, isAdmin } = useAdminStore()
  const navigate = useNavigate()

  async function handleLogout() {
    await logout()
    navigate('/admin/login', { replace: true })
  }

  return (
    <div className="min-h-screen bg-crema dark:bg-oscuro-bg">
      {/* Header */}
      <div className="border-b border-crema-200 dark:border-oscuro-border px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-cafe-dark dark:text-crema-100">Panel Admin</h1>
          <p className="text-xs text-cafe-light dark:text-crema-400">{session?.user.email}</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/')}
            className="text-xs text-cafe-light dark:text-crema-400 underline"
          >
            Ver app
          </button>
          <button
            onClick={handleLogout}
            className="text-xs text-red-400"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Módulos */}
      <div className="px-6 py-6 space-y-3 max-w-lg mx-auto">
        <h2 className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide">
          Contenido
        </h2>

        <button
          onClick={() => navigate('/admin/novenas')}
          className="w-full flex items-center justify-between bg-white dark:bg-oscuro-surface
                     border border-crema-200 dark:border-oscuro-border rounded-2xl px-5 py-4
                     active:scale-[0.98] transition-all"
        >
          <div className="text-left">
            <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200">Novenas</p>
            <p className="text-xs text-cafe-light dark:text-crema-400 mt-0.5">Agregar, editar y eliminar novenas</p>
          </div>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-cafe-light dark:text-crema-400 flex-shrink-0">
            <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

      </div>
    </div>
  )
}
