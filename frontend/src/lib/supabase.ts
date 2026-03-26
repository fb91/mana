import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL  as string
const supabaseAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnon) {
  console.warn('Supabase env vars no configuradas (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)')
}

export const supabase = createClient(supabaseUrl, supabaseAnon)

/** Reintenta una función async hasta `attempts` veces con `delayMs` entre intentos. */
export async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1500,
): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (err) {
      if (i === attempts - 1) throw err
      await new Promise(res => setTimeout(res, delayMs))
    }
  }
  throw new Error('unreachable')
}
