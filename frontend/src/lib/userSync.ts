import { supabase } from './supabase'
import type { NovenaProgreso, PlanEspiritualProgreso, SavedCitation } from '../store/useAppStore'

export interface SyncableState {
  novenasProgreso: NovenaProgreso[]
  planEspiritual: PlanEspiritualProgreso | null
  savedCitations: SavedCitation[]
  lastBiblePath: string | null
  pinnedBooks: string[]
  recentRecommendations: string[]
  estadoDeVida: string | null
}

export async function fetchUserData(userId: string): Promise<SyncableState | null> {
  const { data, error } = await supabase
    .from('user_data')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !data) return null

  return {
    novenasProgreso: (data.novenas_progreso as NovenaProgreso[]) ?? [],
    planEspiritual: (data.plan_espiritual as PlanEspiritualProgreso) ?? null,
    savedCitations: (data.saved_citations as SavedCitation[]) ?? [],
    lastBiblePath: (data.last_bible_path as string) ?? null,
    pinnedBooks: (data.pinned_books as string[]) ?? [],
    recentRecommendations: (data.recent_recommendations as string[]) ?? [],
    estadoDeVida: (data.estado_de_vida as string) ?? null,
  }
}

export async function upsertUserData(userId: string, state: SyncableState): Promise<void> {
  const { error } = await supabase
    .from('user_data')
    .upsert(
      {
        user_id: userId,
        novenas_progreso: state.novenasProgreso,
        plan_espiritual: state.planEspiritual,
        saved_citations: state.savedCitations,
        last_bible_path: state.lastBiblePath,
        pinned_books: state.pinnedBooks,
        recent_recommendations: state.recentRecommendations,
        estado_de_vida: state.estadoDeVida,
      },
      { onConflict: 'user_id' },
    )
  if (error) console.warn('[userSync] upsert error:', error.message)
}

/**
 * Combina datos remotos y locales de forma aditiva: nunca se pierde progreso de
 * ninguno de los dos lados (unión de días completados, unión de citas, etc.)
 */
export function mergeStates(local: SyncableState, remote: SyncableState): SyncableState {
  // novenasProgreso: merge por novenaId — unión de diasCompletados
  const novenasMap = new Map<number, NovenaProgreso>()
  ;[...remote.novenasProgreso, ...local.novenasProgreso].forEach((np) => {
    const existing = novenasMap.get(np.novenaId)
    if (!existing) {
      novenasMap.set(np.novenaId, np)
    } else {
      const dias = Array.from(
        new Set([...existing.diasCompletados, ...np.diasCompletados]),
      ).sort((a, b) => a - b)
      novenasMap.set(np.novenaId, {
        ...existing,
        ...np, // metadatos locales (intención, notificación) ganan
        diasCompletados: dias,
        diaActual: Math.max(existing.diaActual, np.diaActual),
      })
    }
  })

  // savedCitations: unión por id — local gana en duplicados
  const citationsMap = new Map<string, SavedCitation>()
  ;[...remote.savedCitations, ...local.savedCitations].forEach((c) => {
    citationsMap.set(c.id, c)
  })

  // planEspiritual: unir tareas/días; usar base del más avanzado
  let planEspiritual = local.planEspiritual
  if (remote.planEspiritual && local.planEspiritual) {
    const dias = Array.from(
      new Set([
        ...remote.planEspiritual.diasCompletados,
        ...local.planEspiritual.diasCompletados,
      ]),
    ).sort((a, b) => a - b)
    const tareas = Array.from(
      new Set([
        ...remote.planEspiritual.tareasCompletadas,
        ...local.planEspiritual.tareasCompletadas,
      ]),
    )
    const base =
      remote.planEspiritual.diasCompletados.length >=
      local.planEspiritual.diasCompletados.length
        ? remote.planEspiritual
        : local.planEspiritual
    planEspiritual = {
      ...base,
      diasCompletados: dias,
      tareasCompletadas: tareas,
      diaActual: Math.max(
        remote.planEspiritual.diaActual,
        local.planEspiritual.diaActual,
      ),
    }
  } else if (remote.planEspiritual && !local.planEspiritual) {
    planEspiritual = remote.planEspiritual
  }

  return {
    novenasProgreso: Array.from(novenasMap.values()),
    savedCitations: Array.from(citationsMap.values()).slice(0, 200),
    planEspiritual,
    lastBiblePath: local.lastBiblePath ?? remote.lastBiblePath,
    pinnedBooks: Array.from(new Set([...local.pinnedBooks, ...remote.pinnedBooks])),
    recentRecommendations: Array.from(
      new Set([...local.recentRecommendations, ...remote.recentRecommendations]),
    ).slice(0, 20),
    estadoDeVida: local.estadoDeVida ?? remote.estadoDeVida,
  }
}
