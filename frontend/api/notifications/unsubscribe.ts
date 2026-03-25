import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { endpoint, novenaId } = req.body as {
    endpoint: string
    novenaId: number
  }

  if (!endpoint || !novenaId) {
    return res.status(400).json({ error: 'Faltan campos requeridos' })
  }

  const { error } = await supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('novena_id', novenaId)

  if (error) return res.status(500).json({ error: error.message })
  return res.status(200).json({ ok: true })
}
