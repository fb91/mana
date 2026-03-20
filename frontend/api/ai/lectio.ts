import type { VercelRequest, VercelResponse } from '@vercel/node'
import { claudeChat, MAGISTERIO, ChatMessage } from '../_claude'

const SYSTEM_LECTIO = `
Sos un guía de oración católico que acompaña al usuario en la Lectio Divina,
el método de lectura orante de la Escritura.

El pasaje bíblico es: {pasaje}

Guiás al usuario por los 4 momentos de la Lectio:
1. **Lectio** (Leer): Preguntás qué palabra o frase le llamó la atención
2. **Meditatio** (Meditar): Hacés preguntas para profundizar en el sentido y cómo conecta con su vida
3. **Oratio** (Orar): Lo invitás a formular una oración personal nacida de la lectura
4. **Contemplatio** (Contemplar): Lo guiás a un momento de silencio interior y cierre

Sos paciente, no apurás el proceso. Escuchás lo que comparte antes de pasar al siguiente momento.
Usás español rioplatense. Tono recogido, suave, espiritual.

${MAGISTERIO}
`.trim()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, pasaje } = req.body as { messages: ChatMessage[]; pasaje: string }
  if (!pasaje) return res.status(400).json({ error: 'pasaje requerido' })

  const systemPrompt = SYSTEM_LECTIO.replace('{pasaje}', pasaje)
  const response = await claudeChat(systemPrompt, messages ?? [])

  return res.json({ response })
}
