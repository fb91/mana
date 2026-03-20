import type { VercelRequest, VercelResponse } from '@vercel/node'
import { claudeChat, MAGISTERIO } from '../_claude.js'
import { createClient } from '@supabase/supabase-js'

type CachedRecomendacion = {
  mensaje: string
  libro: string
  libroNombre: string
  capitulo: number
  versiculo: number
}

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const VALID_MOODS = new Set([
  'triste', 'ansioso', 'agradecido', 'alegre', 'confiado',
  'solo', 'esperanzado', 'cansado', 'perdido', 'culpable',
  'desanimado', 'confundido', 'enojado', 'vacío', 'pleno',
  'amado', 'acompañado', 'fortalecido',
])

function normalizeMood(raw: string): string | null {
  const parts = raw.split(',').map(s => s.trim().toLowerCase()).filter(s => VALID_MOODS.has(s))
  if (parts.length === 0) return null
  return [...new Set(parts)].sort((a, b) => a.localeCompare(b)).join(',')
}

const CACHE_THRESHOLD = 20

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

  const { estadoAnimo } = req.body as { 
    estadoAnimo: string
  }
  if (!estadoAnimo?.trim()) {
    return res.status(422).json({ error: 'INVALID_INPUT' })
  }

  const supabase = getSupabase()
  const normalizedMood = normalizeMood(estadoAnimo)

  // Intentar servir desde caché si hay suficientes recomendaciones
  if (supabase && normalizedMood) {
    const { count } = await supabase
      .from('recomendaciones_cache')
      .select('*', { count: 'exact', head: true })
      .eq('estado_animo', normalizedMood)

    if (count && count >= CACHE_THRESHOLD) {
      // Traer uno aleatorio usando offset random
      const randomOffset = Math.floor(Math.random() * count)
      const { data } = await supabase
        .from('recomendaciones_cache')
        .select('mensaje, libro, libro_nombre, capitulo, versiculo')
        .eq('estado_animo', normalizedMood)
        .range(randomOffset, randomOffset)
        .single()

      if (data) {
        return res.json({
          mensaje: data.mensaje,
          libro: data.libro,
          libroNombre: data.libro_nombre,
          capitulo: data.capitulo,
          versiculo: data.versiculo,
          textoVersiculo: '', // resolved client-side
        })
      }
    }
  }

  // No hay suficiente caché → pedir a la IA
  let userMessage = `Me siento: ${normalizedMood ? normalizedMood.split(',').join(', ') : estadoAnimo}`
  if (supabase && normalizedMood) {
    const { data: cached } = await supabase
      .from('recomendaciones_cache')
      .select('libro, capitulo, versiculo')
      .eq('estado_animo', normalizedMood)

    if (cached && cached.length > 0) {
      const refs = cached.map(r => `${r.libro} ${r.capitulo}:${r.versiculo}`)
      userMessage += `\n\nNOTA: Por favor NO recomiendes ninguno de estos pasajes ya sugeridos: ${refs.join(', ')}`
    }
  }

  const rawText = await claudeChat(
    SYSTEM_BIBLIA_RECOMENDACION,
    [{ role: 'user', content: userMessage }]
  )

  let parsed: CachedRecomendacion
  try {
    const jsonStr = rawText.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```$/, '').trim()
    parsed = JSON.parse(jsonStr)
  } catch {
    return res.status(422).json({ error: 'INVALID_INPUT' })
  }

  // Guardar en Supabase para ir llenando el caché
  if (supabase && normalizedMood) {
    await supabase.from('recomendaciones_cache').insert({
      estado_animo: normalizedMood,
      mensaje: parsed.mensaje,
      libro: parsed.libro,
      libro_nombre: parsed.libroNombre,
      capitulo: parsed.capitulo,
      versiculo: parsed.versiculo,
    })
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
