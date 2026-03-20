import type { VercelRequest, VercelResponse } from '@vercel/node'
import { claudeChat, MAGISTERIO } from '../_claude.js'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const SYSTEM_LECTIO_BIBLICA = `
Sos un guía de oración católico que conduce una Lectio Divina sobre un pasaje de la Biblia.
Recibirás el texto del pasaje seleccionado y generarás una guía completa y contextualizada.
Todo el contenido debe estar arraigado en la tradición espiritual católica y el Magisterio.

Respondés ÚNICAMENTE con un objeto JSON válido, sin markdown, sin texto adicional:
{
  "pasaje": "<referencia del pasaje, ej: Juan 15:1-5>",
  "lectio": "<instrucción para la lectura orante, invitando a leer despacio el texto dado, 2-3 oraciones>",
  "meditatioIntro": "<introducción a la meditación sobre ese pasaje específico, 1-2 oraciones>",
  "meditatioPreguntas": ["<pregunta profunda sobre el texto 1>", "<pregunta profunda sobre el texto 2>", "<pregunta profunda sobre el texto 3>"],
  "oratio": "<invitación a formular una oración personal nacida de este pasaje, 2-3 oraciones>",
  "contemplatio": "<guía al silencio interior y cierre recogido, 2-3 oraciones>"
}

Las preguntas y el contenido deben estar directamente anclados en el texto del pasaje recibido.
Usás español rioplatense. Tono recogido, cálido y espiritual — no académico.

RESTRICCIÓN: ${MAGISTERIO}
`.trim()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { libro, libroNombre, capitulo, versos, textos } =
    req.body as { libro: string; libroNombre: string; capitulo: number; versos: number[]; textos: string[] }

  if (!versos?.length || !textos?.length) {
    return res.status(400).json({ error: 'Se requieren versículos' })
  }

  const versoRange = versos.length === 1
    ? `${versos[0]}`
    : `${versos[0]}-${versos[versos.length - 1]}`

  // Clave única para este pasaje: "Jn:1:1-5"
  const pasajeKey = `${libro}:${capitulo}:${versoRange}`

  // Intentar servir desde caché
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data } = await supabase
        .from('lectio_cache')
        .select('pasaje, lectio, meditatio_intro, meditatio_preguntas, oratio, contemplatio')
        .eq('pasaje_key', pasajeKey)
        .single()

      if (data) {
        return res.json({
          pasaje: data.pasaje,
          lectio: data.lectio,
          meditatioIntro: data.meditatio_intro,
          meditatioPreguntas: data.meditatio_preguntas,
          oratio: data.oratio,
          contemplatio: data.contemplatio,
        })
      }
    } catch { /* cache miss or DB error — continue to AI */ }
  }

  // No hay caché → pedir a la IA
  const verseLines = versos.map((n, i) => `${n} ${textos[i]}`).join('\n')
  const context = `${libroNombre} ${capitulo}:${versoRange}\n\n${verseLines}`

  const rawText = await claudeChat(SYSTEM_LECTIO_BIBLICA, [{ role: 'user', content: context }])

  let parsed
  try {
    const jsonStr = rawText.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    return res.status(500).json({ error: 'Error al generar la Lectio' })
  }

  // Guardar en Supabase para futuras consultas
  if (supabase) {
    try {
      await supabase.from('lectio_cache').upsert({
        pasaje_key: pasajeKey,
        pasaje: parsed.pasaje,
        lectio: parsed.lectio,
        meditatio_intro: parsed.meditatioIntro,
        meditatio_preguntas: parsed.meditatioPreguntas,
        oratio: parsed.oratio,
        contemplatio: parsed.contemplatio,
      }, { onConflict: 'pasaje_key' })
    } catch { /* save failed — no problem, next time will generate again */ }
  }

  return res.json(parsed)
}
