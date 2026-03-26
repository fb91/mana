import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getLiturgicalAppColor } from '../lib/lectionaryResolver'
import type { PlanEspiritual, PlanEspiritualParams } from '../services/api'

export interface PlanEspiritualProgreso {
  cacheKey: string
  plan: PlanEspiritual
  params: PlanEspiritualParams
  fechaInicio: string          // ISO "2024-03-25"
  diaActual: number            // último día marcado como completado (0 = sin empezar)
  diasCompletados: number[]    // [1, 2, 3, ...]
  tareasCompletadas: string[]  // "1-lectura", "1-oracion", "1-accion", "1-reflexion"
  notificacion: {
    activa: boolean
    hora: string
  } | null
}

export interface NovenaProgreso {
  novenaId: number
  nombreNovena: string
  santo: string
  diaActual: number          // último día marcado como rezado (0 = sin empezar)
  fechaInicio: string        // ISO date "2024-03-25"
  intencion: string
  diasCompletados: number[]  // [1, 2, 3, ...]
  notificacion: {
    activa: boolean
    hora: string             // "08:00"
  } | null
}

export interface SavedCitation {
  id: string
  abbr: string
  bookName: string
  chapter: number
  verseNumbers: number[]
  verseTexts: string[]
  comment: string
  category: string
  savedAt: number
}

export type Theme      = 'claro' | 'oscuro' | 'luz' | 'juvenil' | 'liturgico'
export type FontFamily = 'inter' | 'garamond' | 'cinzel'

export const FONT_PRESETS          = { small: 17, normal: 19, large: 22 } as const
export const GARAMOND_FONT_PRESETS = { small: 17, normal: 19, large: 22 } as const

export const VALID_THEMES: Theme[] = ['claro', 'oscuro', 'luz', 'juvenil', 'liturgico']

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

  // Seguir el modo oscuro del sistema operativo (solo mobile)
  followSystemDark: boolean
  setFollowSystemDark: (on: boolean) => void

  // Push subscription
  pushSubscription: PushSubscriptionJSON | null
  setPushSubscription: (sub: PushSubscriptionJSON | null) => void

  // Biblia
  pinnedBooks: string[]
  togglePinnedBook: (abbr: string) => void
  lastBiblePath: string | null
  setLastBiblePath: (path: string) => void

  // Recomendaciones bíblicas (caché para evitar repetir pasajes)
  recentRecommendations: string[] // Array de referencias "Libro Capitulo:Versiculo"
  addRecommendation: (ref: string) => void
  clearRecommendations: () => void

  // Citas bíblicas guardadas
  savedCitations: SavedCitation[]
  addSavedCitation: (citation: Omit<SavedCitation, 'id' | 'savedAt'>) => void
  removeSavedCitation: (id: string) => void
  updateSavedCitation: (id: string, updates: Partial<Pick<SavedCitation, 'comment' | 'category'>>) => void

  // Novenas en progreso
  novenasProgreso: NovenaProgreso[]
  setNovenaProgreso: (progreso: NovenaProgreso) => void
  removeNovenaProgreso: (novenaId: number) => void
  updateNovenaIntencion: (novenaId: number, intencion: string) => void
  updateNovenaNotificacion: (novenaId: number, notificacion: NovenaProgreso['notificacion']) => void
  marcarDiaRezado: (novenaId: number, dia: number) => void

  // Plan espiritual activo
  planEspiritual: PlanEspiritualProgreso | null
  setPlanEspiritual: (plan: PlanEspiritualProgreso) => void
  removePlanEspiritual: () => void
  marcarTareaEspiritual: (tareaKey: string) => void
  desmarcarTareaEspiritual: (tareaKey: string) => void
  marcarDiaPlanCompletado: (dia: number) => void
  updatePlanNotificacion: (notificacion: PlanEspiritualProgreso['notificacion']) => void

  /** Reemplaza todos los campos sincronizables con datos provenientes de la nube. */
  hydrateFromCloud: (data: {
    novenasProgreso: NovenaProgreso[]
    planEspiritual: PlanEspiritualProgreso | null
    savedCitations: SavedCitation[]
    lastBiblePath: string | null
    pinnedBooks: string[]
    recentRecommendations: string[]
    estadoDeVida: string | null
  }) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      theme: 'claro',
      setTheme: (theme) => {
        applyTheme(theme)
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
        applyTheme(get().theme)
        set({ liturgicalAccent: on })
      },

      followSystemDark: false,
      setFollowSystemDark: (on) => set({ followSystemDark: on }),

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

      recentRecommendations: [],
      addRecommendation: (ref) => set((s) => {
        const updated = [ref, ...s.recentRecommendations]
        // Mantener solo los últimos 20 pasajes
        return { recentRecommendations: updated.slice(0, 20) }
      }),
      clearRecommendations: () => set({ recentRecommendations: [] }),

      savedCitations: [],
      addSavedCitation: (citation) => set((s) => ({
        savedCitations: [
          { ...citation, id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, savedAt: Date.now() },
          ...s.savedCitations,
        ].slice(0, 200),
      })),
      removeSavedCitation: (id) => set((s) => ({
        savedCitations: s.savedCitations.filter(c => c.id !== id),
      })),
      updateSavedCitation: (id, updates) => set((s) => ({
        savedCitations: s.savedCitations.map(c => c.id === id ? { ...c, ...updates } : c),
      })),

      novenasProgreso: [],
      setNovenaProgreso: (progreso) => set((s) => ({
        novenasProgreso: [
          ...s.novenasProgreso.filter(p => p.novenaId !== progreso.novenaId),
          progreso,
        ],
      })),
      removeNovenaProgreso: (novenaId) => set((s) => ({
        novenasProgreso: s.novenasProgreso.filter(p => p.novenaId !== novenaId),
      })),
      updateNovenaIntencion: (novenaId, intencion) => set((s) => ({
        novenasProgreso: s.novenasProgreso.map(p =>
          p.novenaId === novenaId ? { ...p, intencion } : p
        ),
      })),
      updateNovenaNotificacion: (novenaId, notificacion) => set((s) => ({
        novenasProgreso: s.novenasProgreso.map(p =>
          p.novenaId === novenaId ? { ...p, notificacion } : p
        ),
      })),
      marcarDiaRezado: (novenaId, dia) => set((s) => ({
        novenasProgreso: s.novenasProgreso.map(p => {
          if (p.novenaId !== novenaId) return p
          const completados = p.diasCompletados.includes(dia)
            ? p.diasCompletados
            : [...p.diasCompletados, dia].sort((a, b) => a - b)
          return { ...p, diasCompletados: completados, diaActual: Math.max(p.diaActual, dia) }
        }),
      })),

      planEspiritual: null,
      setPlanEspiritual: (plan) => set({ planEspiritual: plan }),
      removePlanEspiritual: () => set({ planEspiritual: null }),
      marcarTareaEspiritual: (tareaKey) => set((s) => {
        if (!s.planEspiritual) return s
        const ya = s.planEspiritual.tareasCompletadas.includes(tareaKey)
        if (ya) return s
        return {
          planEspiritual: {
            ...s.planEspiritual,
            tareasCompletadas: [...s.planEspiritual.tareasCompletadas, tareaKey],
          },
        }
      }),
      desmarcarTareaEspiritual: (tareaKey) => set((s) => {
        if (!s.planEspiritual) return s
        return {
          planEspiritual: {
            ...s.planEspiritual,
            tareasCompletadas: s.planEspiritual.tareasCompletadas.filter(k => k !== tareaKey),
          },
        }
      }),
      marcarDiaPlanCompletado: (dia) => set((s) => {
        if (!s.planEspiritual) return s
        const completados = s.planEspiritual.diasCompletados.includes(dia)
          ? s.planEspiritual.diasCompletados
          : [...s.planEspiritual.diasCompletados, dia].sort((a, b) => a - b)
        return {
          planEspiritual: {
            ...s.planEspiritual,
            diasCompletados: completados,
            diaActual: Math.max(s.planEspiritual.diaActual, dia),
          },
        }
      }),
      updatePlanNotificacion: (notificacion) => set((s) => {
        if (!s.planEspiritual) return s
        return { planEspiritual: { ...s.planEspiritual, notificacion } }
      }),

      hydrateFromCloud: (data) => set({
        novenasProgreso: data.novenasProgreso,
        planEspiritual: data.planEspiritual,
        savedCitations: data.savedCitations,
        ...(data.lastBiblePath !== null ? { lastBiblePath: data.lastBiblePath } : {}),
        pinnedBooks: data.pinnedBooks,
        recentRecommendations: data.recentRecommendations,
        ...(data.estadoDeVida !== null ? { estadoDeVida: data.estadoDeVida } : {}),
      }),
    }),
    {
      name: 'mana-store',
      partialize: (state) => ({
        theme: state.theme,
        fontSizeValue: state.fontSizeValue,
        fontFamily: state.fontFamily,
        liturgicalAccent: state.liturgicalAccent,
        followSystemDark: state.followSystemDark,
        estadoDeVida: state.estadoDeVida,
        pushSubscription: state.pushSubscription,
        pinnedBooks: state.pinnedBooks,
        lastBiblePath: state.lastBiblePath,
        recentRecommendations: state.recentRecommendations,
        savedCitations: state.savedCitations,
        novenasProgreso: state.novenasProgreso,
        planEspiritual: state.planEspiritual,
      }),
    }
  )
)

const ALL_THEME_CLASSES = [
  'theme-claro', 'theme-oscuro', 'theme-luz', 'theme-juvenil',
  // Remove legacy classes that may have been persisted
  'theme-liturgico', 'theme-colorido', 'theme-rosa', 'theme-rojo',
  // Liturgical accent sub-variants
  'theme-liturgico-violet', 'theme-liturgico-white',
  'theme-liturgico-red', 'theme-liturgico-green', 'theme-liturgico-rose',
]

// Temas que activan el modo oscuro de Tailwind (dark:)
const DARK_THEMES: Theme[] = ['oscuro']

export function applyTheme(theme: Theme) {
  const html = document.documentElement
  ALL_THEME_CLASSES.forEach(c => html.classList.remove(c))

  if (theme === 'liturgico') {
    // Base clara + acento del tiempo litúrgico activo
    html.classList.remove('dark')
    html.classList.add('theme-claro')
    const color = getLiturgicalAppColor(new Date())
    html.classList.add(`theme-liturgico-${color}`)
  } else {
    html.classList.toggle('dark', DARK_THEMES.includes(theme))
    html.classList.add(`theme-${theme}`)
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
