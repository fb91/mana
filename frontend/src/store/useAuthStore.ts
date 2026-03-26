import { create } from 'zustand'
import type { User, Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface AuthStore {
  user: User | null
  session: Session | null
  loading: boolean
  /** Inicializa listeners de auth. Devuelve una función de cleanup. */
  init: () => () => void
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  session: null,
  loading: true,

  init: () => {
    // Sesión inicial (puede existir si el usuario ya había iniciado sesión antes)
    supabase.auth.getSession().then(({ data: { session } }) => {
      set({ user: session?.user ?? null, session, loading: false })
    })

    // Escucha cambios de sesión (login, logout, refresh de token)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      set({ user: session?.user ?? null, session, loading: false })
    })

    return () => subscription.unsubscribe()
  },

  signInWithGoogle: async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/ajustes`,
      },
    })
  },

  signOut: async () => {
    await supabase.auth.signOut()
  },
}))
