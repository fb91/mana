import { useState } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import Icon from './Icon'

/** Logo SVG de Google (colores oficiales) */
function GoogleLogo({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

const BENEFITS = [
  {
    icon: 'beads' as const,
    text: 'Tus novenas en curso y los días rezados se conservan en todos tus dispositivos.',
  },
  {
    icon: 'sparkles' as const,
    text: 'Los planes del asistente espiritual y tu progreso continúan donde los dejaste.',
  },
  {
    icon: 'bookmark' as const,
    text: 'Las citas bíblicas guardadas estarán siempre disponibles, incluso si reinstalás la app.',
  },
]

export default function GoogleLoginBanner() {
  const { user, loading, signInWithGoogle, signOut } = useAuthStore()
  const [signingIn, setSigningIn] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  const handleSignIn = async () => {
    setSigningIn(true)
    try {
      await signInWithGoogle()
    } catch {
      setSigningIn(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    try {
      await signOut()
    } finally {
      setSigningOut(false)
    }
  }

  // Mientras se resuelve la sesión inicial no mostramos nada (evita flash)
  if (loading) return null

  // ── Usuario autenticado ──────────────────────────────────────
  if (user) {
    const name = user.user_metadata?.full_name as string | undefined
    const email = user.email
    const avatar = user.user_metadata?.avatar_url as string | undefined

    return (
      <section>
        <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
          Cuenta de Google
        </p>
        <div className="card px-4 py-4">
          <div className="flex items-center gap-3">
            {avatar ? (
              <img
                src={avatar}
                alt={name ?? 'Avatar'}
                className="w-10 h-10 rounded-full flex-shrink-0 border border-crema-200 dark:border-oscuro-border"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-dorado/10 flex items-center justify-center flex-shrink-0">
                <Icon name="user" size={18} className="text-dorado" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              {name && (
                <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200 truncate leading-tight">
                  {name}
                </p>
              )}
              {email && (
                <p className="text-xs text-cafe-light dark:text-crema-400 truncate mt-0.5">
                  {email}
                </p>
              )}
              <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
                Datos sincronizados
              </p>
            </div>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex-shrink-0 text-xs text-cafe-light dark:text-crema-400 hover:text-rojo dark:hover:text-red-400 transition-colors disabled:opacity-50 px-2 py-1"
            >
              {signingOut ? 'Saliendo…' : 'Salir'}
            </button>
          </div>
        </div>
      </section>
    )
  }

  // ── Usuario no autenticado ───────────────────────────────────
  return (
    <section>
      <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold mb-3">
        Cuenta de Google
      </p>
      <div className="card px-4 py-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-dorado/10 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Icon name="user" size={17} className="text-dorado" />
          </div>
          <div>
            <p className="text-sm font-semibold text-cafe-dark dark:text-crema-200 leading-tight">
              Identificate con Google
            </p>
            <p className="text-xs text-cafe-light dark:text-crema-300 mt-1 leading-relaxed">
              Guardá tu progreso espiritual en la nube y accedé desde cualquier
              dispositivo, incluso después de desinstalar la app.
            </p>
          </div>
        </div>

        {/* Beneficios */}
        <ul className="space-y-2.5">
          {BENEFITS.map(({ icon, text }) => (
            <li key={text} className="flex items-start gap-2.5">
              <div className="w-6 h-6 rounded-md bg-dorado/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <Icon name={icon} size={13} className="text-dorado" />
              </div>
              <p className="text-xs text-cafe-dark dark:text-crema-300 leading-relaxed">
                {text}
              </p>
            </li>
          ))}
        </ul>

        {/* Botón de Google */}
        <button
          onClick={handleSignIn}
          disabled={signingIn}
          className={[
            'w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border-2 font-semibold text-sm transition-all duration-150 active:scale-[0.98]',
            'bg-white dark:bg-oscuro-surface border-crema-200 dark:border-oscuro-border',
            'text-cafe-dark dark:text-crema-200',
            'hover:border-dorado/60 hover:shadow-sm',
            'disabled:opacity-60 disabled:cursor-not-allowed',
          ].join(' ')}
        >
          <GoogleLogo size={20} />
          {signingIn ? 'Redirigiendo…' : 'Continuar con Google'}
        </button>

        <p className="text-[10px] text-cafe-light dark:text-crema-500 text-center leading-relaxed">
          No es necesario registrarse ni recordar contraseñas. Solo usamos tu
          cuenta de Google para identificarte.
        </p>
      </div>
    </section>
  )
}
