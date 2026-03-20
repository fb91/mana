import type { VercelRequest, VercelResponse } from '@vercel/node'
import { claudeChat, parseAIJson, MAGISTERIO } from '../_claude.js'

const SYSTEM_SANTO = `
Sos un experto en hagiografía católica y acompañamiento espiritual.
Tu tarea es recomendar exactamente 3 santos de la tradición católica (reconocidos por la Santa Sede)
que conecten genuinamente con el perfil espiritual y vital del usuario.

El usuario autoevaluó distintos aspectos de su vida en una escala del 1 al 5 (1=muy bajo, 5=muy alto).
Usás esos puntajes para entender su situación y elegir los santos más afines.

RESPONDÉS SOLO con un JSON válido, sin markdown ni texto adicional:
{
  "texto": "<mensaje introductorio cálido, 1-2 oraciones, mencionando algo específico de su perfil>",
  "santos": [
    {
      "nombre": "<nombre completo>",
      "epoca": "<período, ej: Siglo XVI>",
      "conexion": "<por qué conecta con ESTE perfil específico, personalizado, 2-3 oraciones>",
      "bio": "<breve biografía, 3-4 oraciones>",
      "frase": "<su frase, lema u oración característica>",
      "cuandoInvocarlo": "<situaciones concretas, 1-2 oraciones>"
    }
  ]
}

Incluís exactamente 3 santos.
Usás español rioplatense. Tu tono es cálido, cercano y esperanzador.

${MAGISTERIO}
`.trim()

const AXIS_LABELS: Record<string, string> = {
  purpose:                   'Vocación / propósito',
  suffering:                 'Manejo del sufrimiento',
  relationships:             'Relaciones cercanas',
  faith:                     'Fe / espiritualidad',
  spirituality_action:       'Espiritualidad activa',
  health_emotional:          'Salud emocional',
  loneliness:                'Soledad / acompañamiento',
  discipline:                'Disciplina / constancia',
  introspection:             'Introspección',
  spirituality_contemplative:'Espiritualidad contemplativa',
  spirituality_trust:        'Confianza / soltar el control',
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { quickProfile = {}, extendedProfile = {}, intent } =
    req.body as { quickProfile: Record<string, number>; extendedProfile?: Record<string, number>; intent?: string }

  let userMessage = 'Perfil espiritual del usuario (escala 1-5, donde 1=muy bajo y 5=muy alto):\n\n'
  userMessage += 'Ejes principales:\n'
  for (const [id, score] of Object.entries(quickProfile)) {
    userMessage += `  - ${AXIS_LABELS[id] ?? id}: ${score}/5\n`
  }
  if (Object.keys(extendedProfile ?? {}).length > 0) {
    userMessage += '\nEjes adicionales (refinamiento):\n'
    for (const [id, score] of Object.entries(extendedProfile!)) {
      userMessage += `  - ${AXIS_LABELS[id] ?? id}: ${score}/5\n`
    }
  }
  if (intent) {
    userMessage += `\nLo que está buscando principalmente: ${intent}\n`
  }
  userMessage += '\nRecomendá 3 santos que conecten profundamente con este perfil.'

  const rawText = await claudeChat(SYSTEM_SANTO, [{ role: 'user', content: userMessage }])
  const parsed = parseAIJson(rawText)

  return res.json({ response: parsed.texto, opciones: [], santos: parsed.santos ?? [] })
}
