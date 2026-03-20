import Anthropic from '@anthropic-ai/sdk'

export type ChatMessage = { role: 'user' | 'assistant'; content: string }

export const MAGISTERIO = `
PRINCIPIO FUNDAMENTAL — MAGISTERIO DE LA IGLESIA CATÓLICA:
Todas tus respuestas deben estar en plena conformidad con el Magisterio de la Iglesia Católica,
que comprende exclusivamente:
  • La Sagrada Escritura (Biblia Católica canónica)
  • La Tradición Apostólica
  • El Catecismo de la Iglesia Católica (CIC)
  • La Doctrina Social de la Iglesia
  • Las Encíclicas y documentos papales
  • Los Concilios Ecuménicos (especialmente el Vaticano II)
  • La enseñanza del Colegio Episcopal en comunión con el Papa

NO constituyen Magisterio y no debes usarlos como fuente:
  • Opiniones personales de sacerdotes o religiosos
  • Teólogos, aunque sean reconocidos
  • Interpretaciones privadas de la Biblia
  • Revelaciones privadas (aunque estén aprobadas)

Si un tema supera tu certeza o podría inducir a error doctrinal:
NO especules, NO improvises, NO inventes. En cambio, decís con humildad:
"Para evacuar esta duda, te recomiendo consultarlo con un sacerdote."

IMPORTANTE sobre el trato al usuario:
Nunca te dirijas al usuario como "hermano" ni "hermana". Usá un trato cercano y cálido sin apelativos religiosos.
`.trim()

export async function claudeChat(systemPrompt: string, messages: ChatMessage[]): Promise<string> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const claudeMessages = messages.length === 0
    ? [{ role: 'user' as const, content: 'Comenzá' }]
    : messages.map(m => ({ role: m.role, content: m.content }))

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    system: systemPrompt,
    messages: claudeMessages,
  })

  const block = response.content.find(b => b.type === 'text')
  if (!block || block.type !== 'text') throw new Error('Respuesta vacía de Claude')
  return block.text
}

export function parseAIJson(raw: string): { texto: string; opciones?: string[]; santos?: unknown[] } {
  const clean = raw.trim()

  // Direct JSON parse
  try { return JSON.parse(clean) } catch { /* continue */ }

  // From ```json ... ``` block
  const fenceMatch = clean.match(/```json\s*([\s\S]*?)```/)
  if (fenceMatch) {
    try { return JSON.parse(fenceMatch[1].trim()) } catch { /* continue */ }
  }

  // First {...} object
  const braceMatch = clean.match(/\{[\s\S]*\}/)
  if (braceMatch) {
    try { return JSON.parse(braceMatch[0]) } catch { /* continue */ }
  }

  return { texto: raw, opciones: [] }
}
