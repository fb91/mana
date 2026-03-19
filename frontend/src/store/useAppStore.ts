import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme    = 'claro' | 'oscuro' | 'juvenil' | 'colorido' | 'rosa' | 'rojo'
export type FontSize = 'small' | 'normal' | 'large'

interface AppState {
  theme: Theme
  setTheme: (theme: Theme) => void

  fontSize: FontSize
  setFontSize: (size: FontSize) => void

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
      theme: 'claro',
      setTheme: (theme) => {
        applyTheme(theme)
        set({ theme })
      },

      fontSize: 'normal',
      setFontSize: (size) => {
        applyFontSize(size)
        set({ fontSize: size })
      },

      estadoDeVida: null,
      setEstadoDeVida: (estado) => set({ estadoDeVida: estado }),

      pushSubscription: null,
      setPushSubscription: (sub) => set({ pushSubscription: sub }),
    }),
    {
      name: 'mana-store',
      partialize: (state) => ({
        theme: state.theme,
        fontSize: state.fontSize,
        estadoDeVida: state.estadoDeVida,
        pushSubscription: state.pushSubscription,
      }),
    }
  )
)

const ALL_THEMES: Theme[] = ['claro', 'oscuro', 'juvenil', 'colorido', 'rosa', 'rojo']

export function applyTheme(theme: Theme) {
  const html = document.documentElement
  ALL_THEMES.forEach(t => html.classList.remove(`theme-${t}`))
  html.classList.add(`theme-${theme}`)
  // 'oscuro' needs Tailwind's dark: variants
  html.classList.toggle('dark', theme === 'oscuro')
}

export function applyFontSize(size: FontSize) {
  const html = document.documentElement
  html.classList.remove('font-small', 'font-large')
  if (size === 'small') html.classList.add('font-small')
  if (size === 'large') html.classList.add('font-large')
}
