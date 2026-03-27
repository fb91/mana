import webpush from 'web-push'
import { createClient } from '@supabase/supabase-js'
import type { VercelRequest, VercelResponse } from '@vercel/node'

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_CONTACT_EMAIL ?? 'admin@mana.app'}`,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
)

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  // Verificar token del cron
  const auth = req.headers.authorization
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Hora y minuto actuales en Buenos Aires (UTC-3, sin horario de verano)
  const now = new Date()
  const fmt = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Argentina/Buenos_Aires',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  // Ventana de ±5 minutos para tolerar retrasos del cron
  const WINDOW_MINUTES = 5
  const times = new Set<string>()
  for (let offset = -WINDOW_MINUTES; offset <= WINDOW_MINUTES; offset++) {
    const d = new Date(now.getTime() + offset * 60_000)
    const parts = fmt.formatToParts(d)
    const h = parts.find(p => p.type === 'hour')!.value.padStart(2, '0')
    const m = parts.find(p => p.type === 'minute')!.value.padStart(2, '0')
    times.add(`${h}:${m}`)
  }

  // Traer todas las suscripciones dentro de la ventana de tiempo
  const { data: subscriptions, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .in('hora_notificacion', Array.from(times))

  if (error) return res.status(500).json({ error: error.message })
  if (!subscriptions?.length) return res.status(200).json({ sent: 0, expired: 0 })

  let sent = 0
  let expired = 0

  for (const row of subscriptions) {
    try {
      await webpush.sendNotification(
        row.subscription as webpush.PushSubscription,
        JSON.stringify({
          title: row.titulo ?? 'Maná — Recordatorio de Novena',
          body: `Es hora de rezar: ${row.novena_nombre}`,
          icon: '/icons/icon-192.png',
          url: row.url ?? `/novenas/${slugify(row.novena_nombre)}`,
        })
      )
      sent++
    } catch (err: any) {
      // 410 Gone / 404 Not Found = la suscripción venció, limpiar
      if (err.statusCode === 410 || err.statusCode === 404) {
        expired++
        await supabase
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', row.endpoint)
          .eq('novena_id', row.novena_id)
      }
    }
  }

  return res.status(200).json({ sent, expired })
}
