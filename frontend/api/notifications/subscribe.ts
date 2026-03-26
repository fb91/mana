import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { subscription, novenaId, nombreNovena, hora, url, titulo } = req.body as {
    subscription: PushSubscriptionJSON
    novenaId: number
    nombreNovena: string
    hora: string // "HH:MM"
    url?: string
    titulo?: string
  }

  if (!subscription?.endpoint || !novenaId || !hora || !nombreNovena) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  const { error } = await supabase.from('push_subscriptions').upsert(
    {
      endpoint: subscription.endpoint,
      novena_id: novenaId,
      novena_nombre: nombreNovena,
      hora_notificacion: hora,
      subscription,
      url: url ?? null,
      titulo: titulo ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'endpoint,novena_id' }
  )

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
