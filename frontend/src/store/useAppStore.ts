import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
  darkMode: boolean
  toggleDarkMode: () => void

  // Examen
  estadoDeVida: string | null
  setEstadoDeVida: (estado: string) => void

  // Push subscription
  pushSubscription: PushSubscriptionJSON | null
  setPushSubscription: (sub: PushSubscriptionJSON | null) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      darkMode: false,
      toggleDarkMode: () =>
        set((s) => {
          const next = !s.darkMode
          document.documentElement.classList.toggle('dark', next)
          return { darkMode: next }
        }),

      estadoDeVida: null,
      setEstadoDeVida: (estado) => set({ estadoDeVida: estado }),

      pushSubscription: null,
      setPushSubscription: (sub) => set({ pushSubscription: sub }),
    }),
    {
      name: 'mana-store',
      partialize: (state) => ({
        darkMode: state.darkMode,
        estadoDeVida: state.estadoDeVida,
        pushSubscription: state.pushSubscription,
      }),
    }
  )
)
