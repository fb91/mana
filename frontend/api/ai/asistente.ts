import type { VercelRequest, VercelResponse } from '@vercel/node'
import { claudeChat, MAGISTERIO } from '../_claude.js'
import { createClient } from '@supabase/supabase-js'

function getSupabase() {
  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  return createClient(url, key)
}

const SYSTEM_ASISTENTE = `
Sos un asistente espiritual católico fiel al Magisterio de la Iglesia Católica.
Tu tarea es generar un plan de ejercicios espirituales personalizado para N días.

REGLAS ESTRICTAS:
- Sé concreto, práctico y breve en cada elemento.
- Adaptá el contenido según los hábitos sin juzgar al usuario.
- No uses etiquetas como "avanzado", "básico", etc.
- Cada día debe incluir: tema, lectura bíblica, reflexión breve, oración y acción concreta.
- La lectura bíblica debe ser una referencia real y existente (ej: "Sal 23:1-3", "Mt 6:9-13").
- La reflexión debe ser breve: 2-3 oraciones máximo.
- La oración debe ser corta y personal: 2-4 oraciones máximo.
- La acción debe ser concreta, realizable en el día, adaptada al tiempo disponible.
- Los días deben tener una progresión lógica que construya hacia el objetivo.
- Usás español rioplatense. Tono cálido, cercano, esperanzador — nunca condescendiente.
- NO agregues texto fuera del JSON.
- RESPONDÉS ÚNICAMENTE con un objeto JSON válido.

Formato de salida (obligatorio):
{
  "titulo": "<título breve y motivador para el plan>",
  "duracionDias": <número>,
  "objetivo": "<descripción del objetivo del plan en 1-2 oraciones>",
  "plan": [
    {
      "dia": 1,
      "tema": "<tema del día, breve>",
      "lectura": "<referencia bíblica: Libro Cap:Vers-Vers>",
      "reflexion": "<reflexión breve anclada en la lectura, 2-3 oraciones>",
      "oracion": "<oración personal breve, 2-4 oraciones>",
      "accion": "<acción concreta y realizable para el día>"
    }
  ]
}

${MAGISTERIO}
`.trim()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const {
    duracion,
    edad,
    estado,
    objetivo,
    contextoLiturgico,
    frecuenciaOracion,
    asistenciaMisa,
  } = req.body as {
    duracion: number
    edad: string
    estado: string
    objetivo: string
    contextoLiturgico: string
    frecuenciaOracion: string
    asistenciaMisa: string
  }

  if (!duracion || !edad || !estado || !objetivo || !contextoLiturgico || !frecuenciaOracion || !asistenciaMisa) {
    return res.status(400).json({ error: 'Faltan parámetros requeridos' })
  }

  // Cache key determinista
  const cacheKey = [duracion, edad, estado, objetivo, contextoLiturgico, frecuenciaOracion, asistenciaMisa].join('|')

  // Intentar servir desde caché
  const supabase = getSupabase()
  if (supabase) {
    try {
      const { data } = await supabase
        .from('planes_espirituales_cache')
        .select('plan_json')
        .eq('cache_key', cacheKey)
        .single()

      if (data?.plan_json) {
        return res.json(data.plan_json)
      }
    } catch { /* cache miss o error de DB — continuar a IA */ }
  }

  // No hay caché → pedir a la IA
  const userMessage = `Generá un plan espiritual con los siguientes parámetros:

- Duración: ${duracion} días
- Edad del usuario: ${edad}
- Estado de vida: ${estado}
- Objetivo principal: ${objetivo}
- Contexto litúrgico actual: ${contextoLiturgico}
- Frecuencia de oración habitual: ${frecuenciaOracion}
- Asistencia a Misa: ${asistenciaMisa}

Recordá adaptar la profundidad, el lenguaje y las acciones concretas al perfil del usuario.
El plan debe tener exactamente ${duracion} días con progresión temática coherente hacia el objetivo.`

  const rawText = await claudeChat(SYSTEM_ASISTENTE, [{ role: 'user', content: userMessage }])

  let parsed
  try {
    const clean = rawText.trim()
      .replace(/^```json\s*/, '')
      .replace(/^```\s*/, '')
      .replace(/```$/, '')
      .trim()
    parsed = JSON.parse(clean)

    // Validar estructura mínima
    if (!parsed.titulo || !parsed.plan || !Array.isArray(parsed.plan)) {
      throw new Error('Estructura inválida')
    }
  } catch {
    return res.status(500).json({ error: 'Error al generar el plan espiritual' })
  }

  // Guardar en Supabase para futuras consultas
  if (supabase) {
    try {
      await supabase.from('planes_espirituales_cache').upsert({
        cache_key: cacheKey,
        plan_json: parsed,
      }, { onConflict: 'cache_key' })
    } catch { /* fallo al guardar — no es crítico */ }
  }

  return res.json(parsed)
}
