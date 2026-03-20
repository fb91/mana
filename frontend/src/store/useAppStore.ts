import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getLiturgicalAppColor } from '../lib/lectionaryResolver'

export type Theme      = 'claro' | 'oscuro'
export type FontFamily = 'inter' | 'garamond' | 'cinzel'

export const FONT_PRESETS          = { small: 17, normal: 19, large: 22 } as const
export const GARAMOND_FONT_PRESETS = { small: 17, normal: 19, large: 22 } as const

export const VALID_THEMES: Theme[] = ['claro', 'oscuro']

interface AppState {
  theme: Theme
  setTheme: (theme: Theme) => void

  fontSizeValue: number
  setFontSizeValue: (value: number) => void

  fontFamily: FontFamily
  setFontFamily: (family: FontFamily) => void

  // Examen
  estadoDeVida: string | null
  setEstadoDeVida: (estado: string) => void

  // Liturgical accent (override accent color regardless of base theme)
  liturgicalAccent: boolean
  setLiturgicalAccent: (on: boolean) => void

  // Push subscription
  pushSubscription: PushSubscriptionJSON | null
  setPushSubscription: (sub: PushSubscriptionJSON | null) => void

  // Biblia
  pinnedBooks: string[]
  togglePinnedBook: (abbr: string) => void
  lastBiblePath: string | null
  setLastBiblePath: (path: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'oscuro',
      setTheme: (theme) => {
        applyTheme(theme, get().liturgicalAccent)
        set({ theme })
      },

      fontSizeValue: 16,
      setFontSizeValue: (value) => {
        applyFontSize(value)
        set({ fontSizeValue: value })
      },

      fontFamily: 'inter',
      setFontFamily: (family) => {
        applyFontFamily(family)
        // Auto-adjust font size when switching to/from Garamond
        const current = get().fontSizeValue
        const interVals = Object.values(FONT_PRESETS)
        const garamondVals = Object.values(GARAMOND_FONT_PRESETS)
        if (family === 'garamond' && interVals.includes(current as 17 | 19 | 22)) {
          const idx = interVals.indexOf(current as 17 | 19 | 22)
          const adjusted = garamondVals[idx]
          applyFontSize(adjusted)
          set({ fontFamily: family, fontSizeValue: adjusted })
        } else if (family !== 'garamond' && garamondVals.includes(current as 17 | 19 | 22)) {
          const idx = garamondVals.indexOf(current as 17 | 19 | 22)
          const adjusted = interVals[idx]
          applyFontSize(adjusted)
          set({ fontFamily: family, fontSizeValue: adjusted })
        } else {
          set({ fontFamily: family })
        }
      },

      estadoDeVida: null,
      setEstadoDeVida: (estado) => set({ estadoDeVida: estado }),

      liturgicalAccent: false,
      setLiturgicalAccent: (on) => {
        applyTheme(get().theme, on)
        set({ liturgicalAccent: on })
      },

      pushSubscription: null,
      setPushSubscription: (sub) => set({ pushSubscription: sub }),

      pinnedBooks: [],
      togglePinnedBook: (abbr) => set((s) => ({
        pinnedBooks: s.pinnedBooks.includes(abbr)
          ? s.pinnedBooks.filter(b => b !== abbr)
          : [...s.pinnedBooks, abbr],
      })),
      lastBiblePath: null,
      setLastBiblePath: (path) => set({ lastBiblePath: path }),
    }),
    {
      name: 'mana-store',
      partialize: (state) => ({
        theme: state.theme,
        fontSizeValue: state.fontSizeValue,
        fontFamily: state.fontFamily,
        liturgicalAccent: state.liturgicalAccent,
        estadoDeVida: state.estadoDeVida,
        pushSubscription: state.pushSubscription,
        pinnedBooks: state.pinnedBooks,
        lastBiblePath: state.lastBiblePath,
      }),
    }
  )
)

const ALL_THEME_CLASSES = [
  'theme-claro', 'theme-oscuro',
  // Remove legacy classes that may have been persisted
  'theme-liturgico', 'theme-juvenil', 'theme-colorido', 'theme-rosa', 'theme-rojo',
  // Liturgical accent sub-variants
  'theme-liturgico-violet', 'theme-liturgico-white',
  'theme-liturgico-red', 'theme-liturgico-green', 'theme-liturgico-rose',
]

export function applyTheme(theme: Theme, liturgicalAccent = false) {
  const html = document.documentElement
  ALL_THEME_CLASSES.forEach(c => html.classList.remove(c))
  html.classList.toggle('dark', theme === 'oscuro')
  html.classList.add(`theme-${theme}`)

  if (liturgicalAccent) {
    const color = getLiturgicalAppColor(new Date())
    html.classList.add(`theme-liturgico-${color}`)
  }
}

export function applyFontSize(value: number) {
  const html = document.documentElement
  html.classList.remove('font-small', 'font-large')
  html.style.fontSize = `${value}px`
}

export function applyFontFamily(family: FontFamily) {
  const html = document.documentElement
  html.classList.remove('font-garamond', 'font-cinzel')
  if (family === 'garamond') html.classList.add('font-garamond')
  if (family === 'cinzel') html.classList.add('font-cinzel')
}
