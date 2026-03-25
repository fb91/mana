import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminStore } from '../../store/useAdminStore'

export default function AdminLoginPage() {
  const { login, session, loading } = useAdminStore()
  const navigate = useNavigate()

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Si ya hay sesión activa, redirigir al panel
  useEffect(() => {
    if (session) navigate('/admin', { replace: true })
  }, [session, navigate])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const err = await login(email, password)
    if (err) {
      setError(err)
      setSubmitting(false)
    } else {
      navigate('/admin', { replace: true })
    }
  }

  if (loading) return null

  return (
    <div className="min-h-screen bg-crema dark:bg-oscuro-bg flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-cafe-dark dark:text-crema-100">Maná</h1>
          <p className="text-sm text-cafe-light dark:text-crema-400 mt-1">Panel de administración</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide block mb-1.5">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full rounded-xl border border-crema-300 dark:border-oscuro-border
                         bg-white dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
                         px-4 py-3 text-sm outline-none focus:border-dorado/60 transition-colors"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide block mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-crema-300 dark:border-oscuro-border
                         bg-white dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
                         px-4 py-3 text-sm outline-none focus:border-dorado/60 transition-colors"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-dorado text-crema-50 rounded-2xl py-3.5 font-semibold
                       text-sm shadow-md active:scale-[0.98] transition-all duration-150
                       disabled:opacity-60"
          >
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
