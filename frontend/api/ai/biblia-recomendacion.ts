import type { VercelRequest, VercelResponse } from '@vercel/node'
import { claudeChat, MAGISTERIO } from '../_claude.js'

const SYSTEM_BIBLIA_RECOMENDACION = `
Sos un acompañante espiritual católico. El usuario te describe brevemente cómo se siente
o qué lo preocupa, y vos respondés con una recomendación de un pasaje bíblico que lo pueda ayudar.
El pasaje debe elegirse desde el Magisterio y la tradición espiritual católica.

Respondés ÚNICAMENTE con un objeto JSON válido, sin markdown, sin texto adicional:
{
  "mensaje": "<mensaje empático de 1-2 oraciones en español rioplatense>",
  "libro": "<abreviatura exacta del libro>",
  "libroNombre": "<nombre completo del libro en español>",
  "capitulo": <número entero>,
  "versiculo": <número entero>
}

NO incluyas el texto del versículo — solo la referencia exacta (libro, capítulo, versículo).
El mensaje debe ser cálido, empático y terminar invitando a leer el pasaje.
Elegís el pasaje con criterio espiritual, priorizando consuelo, esperanza y fortaleza.
Verificás que el capítulo y versículo existan en la Biblia Católica.

Abreviaturas válidas: Gn, Ex, Lv, Nm, Dt, Jos, Jue, Rt, 1Sam, 2Sam, 1Re, 2Re, 1Cro, 2Cro,
Esd, Neh, Tb, Jdt, Est, 1Mac, 2Mac, Job, Sal, Prov, Ecl, Cant, Sab, Sir, Is, Jr, Lam, Bar,
Ez, Dn, Os, Jl, Am, Abd, Jon, Miq, Nah, Hab, Sof, Ag, Zac, Mal, Mt, Mc, Lc, Jn, Hch, Rom,
1Cor, 2Cor, Gal, Ef, Flp, Col, 1Tes, 2Tes, 1Tim, 2Tim, Tit, Flm, Heb, Sant, 1Pe, 2Pe,
1Jn, 2Jn, 3Jn, Jds, Ap

RESTRICCIÓN: ${MAGISTERIO}
`.trim()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { estadoAnimo, excludedPassages = [] } = req.body as { 
    estadoAnimo: string
    excludedPassages?: string[]
  }
  if (!estadoAnimo?.trim()) {
    return res.status(422).json({ error: 'INVALID_INPUT' })
  }

  // Construir mensaje del usuario con restricciones de pasajes si existen
  let userMessage = estadoAnimo
  if (excludedPassages.length > 0) {
    userMessage += `\n\nNOTA: Por favor NO recomiendes ninguno de estos pasajes que ya sugeriste anteriormente: ${excludedPassages.join(', ')}`
  }

  const rawText = await claudeChat(
    SYSTEM_BIBLIA_RECOMENDACION,
    [{ role: 'user', content: userMessage }]
  )

  let parsed: { mensaje: string; libro: string; libroNombre: string; capitulo: number; versiculo: number }
  try {
    const jsonStr = rawText.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    return res.status(422).json({ error: 'INVALID_INPUT' })
  }

  // Return without verse text — frontend resolves it from the locally cached bible JSON
  return res.json({
    mensaje: parsed.mensaje,
    libro: parsed.libro,
    libroNombre: parsed.libroNombre,
    capitulo: parsed.capitulo,
    versiculo: parsed.versiculo,
    textoVersiculo: '', // resolved client-side
  })
}
