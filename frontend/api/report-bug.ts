import type { VercelRequest, VercelResponse } from '@vercel/node'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { page = '', description = '' } = req.body as { page?: string; description?: string }
  const cleanPage = String(page).trim().slice(0, 200)
  const cleanDesc = String(description).trim().slice(0, 1000)

  if (!cleanDesc) return res.status(400).json({ error: 'La descripción es requerida.' })

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    console.warn(`BugReport recibido (sin RESEND_API_KEY): [${cleanPage}] ${cleanDesc}`)
    return res.json({ ok: true })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Maná App <onboarding@resend.dev>',
      to: ['fabriciob91@gmail.com'],
      subject: `Bug report — ${cleanPage}`,
      text: `Página: ${cleanPage}\n\nDescripción:\n${cleanDesc}`,
    }),
  })

  if (emailRes.ok) return res.json({ ok: true })
  return res.status(500).json({ error: 'No se pudo enviar el reporte.' })
}
