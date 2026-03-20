import type { VercelRequest, VercelResponse } from '@vercel/node'
import { claudeChat, MAGISTERIO } from '../_claude'

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
  "contemplatio": "<guía al silencio interior y cierre recogido, 2-3 oraciones>",
  "preguntasProfundas": ["<pregunta para seguir profundizando 1>", "<pregunta para seguir profundizando 2>"]
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

  return res.json(parsed)
}
