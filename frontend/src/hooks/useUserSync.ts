import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/useAuthStore'
import { useAppStore } from '../store/useAppStore'
import { fetchUserData, upsertUserData, mergeStates, type SyncableState } from '../lib/userSync'

function getLocalSyncableState(): SyncableState {
  const s = useAppStore.getState()
  return {
    novenasProgreso: s.novenasProgreso,
    planEspiritual: s.planEspiritual,
    savedCitations: s.savedCitations,
    lastBiblePath: s.lastBiblePath,
    pinnedBooks: s.pinnedBooks,
    recentRecommendations: s.recentRecommendations,
    estadoDeVida: s.estadoDeVida,
  }
}

const SYNC_DEBOUNCE_MS = 3000

/**
 * Gestiona la sincronización bidireccional con Supabase.
 * - Al iniciar sesión: descarga datos remotos y los fusiona con los locales.
 * - Mientras la sesión está activa: sube cambios locales con debounce de 3 s.
 *
 * No requiere props. Se monta una sola vez en App.tsx.
 */
export function useUserSync() {
  const userId = useAuthStore((s) => s.user?.id ?? null)
  const syncedRef = useRef(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  // Cuando el usuario inicia sesión: fusionar datos remotos con locales
  useEffect(() => {
    if (!userId) {
      syncedRef.current = false
      return
    }

    const syncOnLogin = async () => {
      try {
        const remote = await fetchUserData(userId)
        const local = getLocalSyncableState()

        if (remote) {
          // Ya tenía datos en la nube → fusionar de forma aditiva
          const merged = mergeStates(local, remote)
          useAppStore.getState().hydrateFromCloud(merged)
          await upsertUserData(userId, merged)
        } else {
          // Primera vez con este usuario → subir datos locales (migración)
          await upsertUserData(userId, local)
        }
      } catch (err) {
        console.warn('[useUserSync] sync on login error:', err)
      } finally {
        syncedRef.current = true
      }
    }

    syncOnLogin()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Observar cambios en el store y subir con debounce mientras haya sesión
  useEffect(() => {
    if (!userId) return

    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (!syncedRef.current) return

      const changed =
        state.novenasProgreso !== prevState.novenasProgreso ||
        state.planEspiritual !== prevState.planEspiritual ||
        state.savedCitations !== prevState.savedCitations ||
        state.lastBiblePath !== prevState.lastBiblePath ||
        state.pinnedBooks !== prevState.pinnedBooks ||
        state.recentRecommendations !== prevState.recentRecommendations ||
        state.estadoDeVida !== prevState.estadoDeVida

      if (!changed) return

      clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        const data = getLocalSyncableState()
        upsertUserData(userId, data).catch((err) =>
          console.warn('[useUserSync] debounced sync error:', err),
        )
      }, SYNC_DEBOUNCE_MS)
    })

    return () => {
      unsubscribe()
      clearTimeout(timerRef.current)
    }
  }, [userId])
}
