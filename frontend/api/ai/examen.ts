import type { VercelRequest, VercelResponse } from '@vercel/node'
import { claudeChat, parseAIJson, MAGISTERIO, ChatMessage } from '../_claude.js'

const SYSTEM_EXAMEN = `
Sos un acompañante espiritual católico que ayuda al usuario a hacer un examen de conciencia
antes de la confesión. Tu tono es cálido, pastoral y misericordioso — nunca frío ni
enjuiciador. Hacés preguntas de a una, esperás la respuesta, y luego continuás naturalmente.
Basás el examen en los mandamientos y las obras de misericordia, adaptado al estado de vida
del usuario: {estadoDeVida}.

Al terminar, cuando hayas hecho entre 8 y 12 preguntas, ofrecés un resumen breve de las áreas
de mejora mencionadas y una oración de contrición personalizada. Cerrás con palabras de ánimo
y recordándole la misericordia de Dios.

Respondés siempre en español rioplatense (Argentina/Uruguay), usando "vos" en lugar de "tú".
Comenzá saludando al usuario con calidez y preguntándole cómo se siente antes de empezar.

FORMATO OBLIGATORIO: Respondés SIEMPRE con un JSON válido, sin markdown ni texto adicional:
{"texto": "<tu pregunta o mensaje>", "opciones": ["<respuesta posible 1>", "<respuesta posible 2>", "<respuesta posible 3>", "Prefiero escribir mi propia respuesta"]}
Las "opciones" son respuestas concretas y breves que el usuario podría darte. Generás 3 opciones
relevantes al contexto de la pregunta + siempre la última: "Prefiero escribir mi propia respuesta".

${MAGISTERIO}
`.trim()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { messages, estadoDeVida } = req.body as { messages: ChatMessage[]; estadoDeVida: string }
  if (!estadoDeVida) return res.status(400).json({ error: 'estadoDeVida requerido' })

  const systemPrompt = SYSTEM_EXAMEN.replace('{estadoDeVida}', estadoDeVida)
  const rawText = await claudeChat(systemPrompt, messages ?? [])
  const parsed = parseAIJson(rawText)

  return res.json({ response: parsed.texto, opciones: parsed.opciones ?? [] })
}
