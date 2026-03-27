import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Session } from '@supabase/supabase-js'
import { supabase, withRetry } from '../lib/supabase'

type Role = 'admin' | 'contributor' | null

interface AdminState {
  session: Session | null
  role: Role
  loading: boolean

  // Inicializa la sesión desde Supabase al arrancar la app. Devuelve cleanup para onAuthStateChange.
  init: () => Promise<() => void>

  login: (email: string, password: string) => Promise<string | null>
  logout: () => Promise<void>

  // Helpers de lectura
  isAdmin: () => boolean
  isContributor: () => boolean
}

export const useAdminStore = create<AdminState>()(
  persist(
    (set, get) => ({
      session: null,
      role: null,
      loading: false,

      init: async () => {
        set({ loading: true })
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          const role = await fetchRole(session.user.id)
          set({ session, role })
        }
        set({ loading: false })

        // Escuchar cambios de sesión (token refresh, logout desde otra pestaña)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (session) {
            const role = await fetchRole(session.user.id)
            set({ session, role })
          } else {
            set({ session: null, role: null })
          }
        })
        return () => subscription.unsubscribe()
      },

      login: async (email, password) => {
        set({ loading: true })
        const { data, error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) {
          set({ loading: false })
          return error.message
        }
        const role = await fetchRole(data.user.id)
        if (!role) {
          await supabase.auth.signOut()
          set({ loading: false })
          return 'Tu cuenta no tiene permisos de administrador.'
        }
        set({ session: data.session, role, loading: false })
        return null
      },

      logout: async () => {
        await supabase.auth.signOut()
        set({ session: null, role: null })
      },

      isAdmin: () => get().role === 'admin',
      isContributor: () => get().role === 'admin' || get().role === 'contributor',
    }),
    {
      name: 'mana-admin',
      // Solo persistir lo mínimo — la sesión real vive en Supabase Auth
      partialize: (s) => ({ role: s.role }),
    }
  )
)

async function fetchRole(userId: string): Promise<Role> {
  try {
    const data = await withRetry(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single()
      if (error) throw error
      return data
    })
    return (data?.role as Role) ?? null
  } catch {
    return null
  }
}
