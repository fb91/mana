/**
 * Genera un slug URL-amigable a partir de un texto en español.
 * "Novena a Nuestra Señora del Rosario" → "novena-a-nuestra-senora-del-rosario"
 */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')                   // descompone ñ → n + combining tilde, á → a + combining accent
    .replace(/[\u0300-\u036f]/g, '')    // elimina los diacríticos (tildes, cedillas, etc.)
    .replace(/[^a-z0-9\s-]/g, '')       // elimina caracteres no alfanuméricos
    .trim()
    .replace(/\s+/g, '-')               // espacios → guiones
    .replace(/-+/g, '-')                // colapsa guiones múltiples
}
