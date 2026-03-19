// ── Bible Reference Parser ────────────────────────────────────────────────────
// Parses liturgical references like "Mt 1:16,18-21.24a" or "Is 7:10-14;8:10"
// into structured segments usable with the existing Bible API.

export interface ParsedRef {
  book: string
  chapter: number
  verses: number[]
}

/**
 * Parses a liturgical reading reference into one or more {book, chapter, verses} objects.
 * Handles:
 *   - Single chapter: "Mt 4:1-11"  → [{book:"Mt", chapter:4, verses:[1..11]}]
 *   - Multi-range:    "Mt 1:16,18-21.24a" → [{book:"Mt", chapter:1, verses:[16,18,19,20,21,24]}]
 *   - Multi-chapter:  "Is 7:10-14;8:10"   → [{book:"Is", chapter:7, verses:[10..14]}, {book:"Is", chapter:8, verses:[10]}]
 *   - Sub-verse letters (a,b,c) are stripped → "5a" becomes verse 5
 */
export function parseBibleRef(ref: string): ParsedRef[] {
  if (!ref || !ref.trim()) return []

  // Separate book abbreviation from chapter:verse specification.
  // Book abbreviations: optional leading digit + letters (e.g. "2Sam", "Mt", "Sal", "1Cor")
  const match = ref.trim().match(/^([1-4]?[A-Za-záéíóúüñÁÉÍÓÚÜÑ]+(?:\s[A-Za-z]+)?)\s+(.+)$/)
  if (!match) return []

  const book = match[1].trim()
  const chapVerseStr = match[2].trim()

  // Split by ";" to handle multi-chapter references like "Is 7:10-14;8:10"
  const segments = chapVerseStr.split(';')
  const result: ParsedRef[] = []

  for (const segment of segments) {
    const colonIdx = segment.indexOf(':')
    if (colonIdx === -1) {
      // No colon: might be just a chapter number (show full chapter)
      const chapter = parseInt(segment.trim(), 10)
      if (!isNaN(chapter)) {
        result.push({ book, chapter, verses: [] })  // empty = show all
      }
      continue
    }

    const chapter = parseInt(segment.substring(0, colonIdx).trim(), 10)
    if (isNaN(chapter)) continue

    const verseStr = segment.substring(colonIdx + 1).trim()
    const verses = parseVerseSpec(verseStr)
    result.push({ book, chapter, verses })
  }

  return result
}

function parseVerseSpec(spec: string): number[] {
  // Normalize: replace "." with "," (both used as group separators in lectionary notation)
  // But don't replace "." inside letter suffixes — we strip those first per-token
  const parts = spec.split(/[,.]/)
  const verses: number[] = []

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    if (trimmed.includes('-')) {
      // Range: "12-14a", "4-5a"
      const [rawStart, rawEnd] = trimmed.split('-')
      const start = parseInt(stripLetterSuffix(rawStart), 10)
      const end = parseInt(stripLetterSuffix(rawEnd), 10)
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) verses.push(i)
      }
    } else {
      // Single verse: "16", "24a", "34b"
      const n = parseInt(stripLetterSuffix(trimmed), 10)
      if (!isNaN(n)) verses.push(n)
    }
  }

  // Deduplicate and sort
  return [...new Set(verses)].sort((a, b) => a - b)
}

function stripLetterSuffix(s: string): string {
  return s.trim().replace(/[a-zA-Z]+$/, '')
}

/** Display-friendly version of a reference, e.g. "Mt 4:1-11" */
export function formatRef(ref: string): string {
  return ref.replace(/\./g, ',').replace(/;/g, '; ')
}

/** Short human label for book abbreviation, using the same map as the backend. */
export const BOOK_NAMES: Record<string, string> = {
  Gn: 'Génesis', Ex: 'Éxodo', Lv: 'Levítico', Nm: 'Números', Dt: 'Deuteronomio',
  Jos: 'Josué', Jue: 'Jueces', Rt: 'Rut',
  '1Sam': '1 Samuel', '2Sam': '2 Samuel', '1Re': '1 Reyes', '2Re': '2 Reyes',
  '1Cro': '1 Crónicas', '2Cro': '2 Crónicas', Esd: 'Esdras', Neh: 'Nehemías',
  Tb: 'Tobías', Jdt: 'Judit', Est: 'Ester',
  '1Mac': '1 Macabeos', '2Mac': '2 Macabeos',
  Job: 'Job', Sal: 'Salmos', Prov: 'Proverbios', Ecl: 'Eclesiastés',
  Cant: 'Cantares', Sab: 'Sabiduría', Sir: 'Eclesiástico',
  Is: 'Isaías', Jr: 'Jeremías', Lam: 'Lamentaciones', Bar: 'Baruc',
  Ez: 'Ezequiel', Dn: 'Daniel',
  Os: 'Oseas', Jl: 'Joel', Am: 'Amós', Abd: 'Abdías', Jon: 'Jonás',
  Miq: 'Miqueas', Nah: 'Nahúm', Hab: 'Habacuc', Sof: 'Sofonías',
  Ag: 'Ageo', Zac: 'Zacarías', Mal: 'Malaquías',
  Mt: 'Mateo', Mc: 'Marcos', Lc: 'Lucas', Jn: 'Juan',
  Hch: 'Hechos', Rom: 'Romanos',
  '1Cor': '1 Corintios', '2Cor': '2 Corintios',
  Gal: 'Gálatas', Ef: 'Efesios', Flp: 'Filipenses', Col: 'Colosenses',
  '1Tes': '1 Tesalonicenses', '2Tes': '2 Tesalonicenses',
  '1Tim': '1 Timoteo', '2Tim': '2 Timoteo',
  Tit: 'Tito', Flm: 'Filemón', Heb: 'Hebreos',
  Sant: 'Santiago', '1Pe': '1 Pedro', '2Pe': '2 Pedro',
  '1Jn': '1 Juan', '2Jn': '2 Juan', '3Jn': '3 Juan',
  Jds: 'Judas', Ap: 'Apocalipsis',
}

export function getBookName(abbr: string): string {
  return BOOK_NAMES[abbr] ?? abbr
}
