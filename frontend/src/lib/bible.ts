import { openDB } from 'idb'
import { BibleBook, BibleChapter, BibleVerse } from '../services/api'

// Canonical Vatican order — mirrors BibleService.kt
const BOOK_META: [string, string, string][] = [
  // abbr, name, testament
  ['Gn',   'Génesis',                'AT'],
  ['Ex',   'Éxodo',                  'AT'],
  ['Lv',   'Levítico',               'AT'],
  ['Nm',   'Números',                'AT'],
  ['Dt',   'Deuteronomio',           'AT'],
  ['Jos',  'Josué',                  'AT'],
  ['Jue',  'Jueces',                 'AT'],
  ['1Sam', '1 Samuel',               'AT'],
  ['2Sam', '2 Samuel',               'AT'],
  ['1Re',  '1 Reyes',                'AT'],
  ['2Re',  '2 Reyes',                'AT'],
  ['Is',   'Isaías',                 'AT'],
  ['Jr',   'Jeremías',               'AT'],
  ['Ez',   'Ezequiel',               'AT'],
  ['Os',   'Oseas',                  'AT'],
  ['Jl',   'Joel',                   'AT'],
  ['Am',   'Amós',                   'AT'],
  ['Abd',  'Abdías',                 'AT'],
  ['Jon',  'Jonás',                  'AT'],
  ['Miq',  'Miqueas',                'AT'],
  ['Nah',  'Nahúm',                  'AT'],
  ['Hab',  'Habacuc',                'AT'],
  ['Sof',  'Sofonías',               'AT'],
  ['Ag',   'Ageo',                   'AT'],
  ['Zac',  'Zacarías',               'AT'],
  ['Mal',  'Malaquías',              'AT'],
  ['Sal',  'Salmos',                 'AT'],
  ['Job',  'Job',                    'AT'],
  ['Prov', 'Proverbios',             'AT'],
  ['Rt',   'Rut',                    'AT'],
  ['Cant', 'Cantar de los Cantares', 'AT'],
  ['Ecl',  'Eclesiastés',            'AT'],
  ['Lam',  'Lamentaciones',          'AT'],
  ['Est',  'Ester',                  'AT'],
  ['Dn',   'Daniel',                 'AT'],
  ['1Cro', '1 Crónicas',             'AT'],
  ['2Cro', '2 Crónicas',             'AT'],
  ['Esd',  'Esdras',                 'AT'],
  ['Neh',  'Nehemías',               'AT'],
  ['Jdt',  'Judit',                  'AT'],
  ['Tb',   'Tobías',                 'AT'],
  ['1Mac', '1 Macabeos',             'AT'],
  ['2Mac', '2 Macabeos',             'AT'],
  ['Sab',  'Sabiduría',              'AT'],
  ['Sir',  'Eclesiástico',           'AT'],
  ['Bar',  'Baruc',                  'AT'],
  ['Mt',   'Mateo',                  'NT'],
  ['Mc',   'Marcos',                 'NT'],
  ['Lc',   'Lucas',                  'NT'],
  ['Jn',   'Juan',                   'NT'],
  ['Hch',  'Hechos',                 'NT'],
  ['Rom',  'Romanos',                'NT'],
  ['1Cor', '1 Corintios',            'NT'],
  ['2Cor', '2 Corintios',            'NT'],
  ['Gal',  'Gálatas',                'NT'],
  ['Ef',   'Efesios',                'NT'],
  ['Flp',  'Filipenses',             'NT'],
  ['Col',  'Colosenses',             'NT'],
  ['1Tes', '1 Tesalonicenses',       'NT'],
  ['2Tes', '2 Tesalonicenses',       'NT'],
  ['1Tim', '1 Timoteo',              'NT'],
  ['2Tim', '2 Timoteo',              'NT'],
  ['Tit',  'Tito',                   'NT'],
  ['Flm',  'Filemón',                'NT'],
  ['Heb',  'Hebreos',                'NT'],
  ['Sant', 'Santiago',               'NT'],
  ['1Pe',  '1 Pedro',                'NT'],
  ['2Pe',  '2 Pedro',                'NT'],
  ['1Jn',  '1 Juan',                 'NT'],
  ['2Jn',  '2 Juan',                 'NT'],
  ['3Jn',  '3 Juan',                 'NT'],
  ['Jds',  'Judas',                  'NT'],
  ['Ap',   'Apocalipsis',            'NT'],
]

export const BOOK_NAME: Record<string, string> = Object.fromEntries(
  BOOK_META.map(([abbr, name]) => [abbr, name])
)

type RawBible = Record<string, Record<string, Record<string, string>>>
type BookData = Record<string, Record<string, string>>
type BibleMeta = Record<string, number> // abbr → chaptersCount

// ── IDB (base de datos propia, separada de mana-db) ──────────────────────────

function getBibleDB() {
  return openDB('mana-bible', 1, {
    upgrade(db) {
      db.createObjectStore('books')
    },
  })
}

// ── Cache en memoria (dura lo que dura la sesión) ─────────────────────────────

const _bookCache: Record<string, BookData> = {}

// ── Seed desde JSON (solo ocurre una vez en la vida del dispositivo) ──────────

let _seedPromise: Promise<void> | null = null

async function seedFromJSON(): Promise<void> {
  if (_seedPromise) return _seedPromise
  _seedPromise = (async () => {
    const r = await fetch('/data/bible_es.json')
    if (!r.ok) throw new Error(`Error cargando Biblia: ${r.status}`)
    const raw: RawBible = await r.json()

    // Poblar cache en memoria
    for (const [abbr, bookData] of Object.entries(raw)) {
      _bookCache[abbr] = bookData
    }

    // Persistir en IDB libro por libro (en background, no bloqueamos la UI)
    try {
      const db = await getBibleDB()
      const tx = db.transaction('books', 'readwrite')
      const meta: BibleMeta = {}
      for (const [abbr, bookData] of Object.entries(raw)) {
        tx.store.put(bookData, abbr)
        meta[abbr] = Object.keys(bookData).length
      }
      tx.store.put(meta, '__meta')
      await tx.done
    } catch {
      // Si IDB falla, la sesión funciona igual desde _bookCache
    }
  })()
  return _seedPromise
}

// ── Carga de un libro: IDB → seed → memoria ───────────────────────────────────

async function loadBook(abbr: string): Promise<BookData> {
  if (_bookCache[abbr]) return _bookCache[abbr]

  try {
    const db = await getBibleDB()
    const cached = await db.get('books', abbr) as BookData | undefined
    if (cached) {
      _bookCache[abbr] = cached
      return cached
    }
  } catch { /* continúa al seed */ }

  // IDB vacío o error → seed completo desde JSON (solo pasa la primera vez)
  await seedFromJSON()
  return _bookCache[abbr]
}

// ── API pública ───────────────────────────────────────────────────────────────

export async function getBibleBooks(): Promise<BibleBook[]> {
  let meta: BibleMeta | null = null

  try {
    const db = await getBibleDB()
    meta = (await db.get('books', '__meta') as BibleMeta | undefined) ?? null
  } catch { /* fall through */ }

  if (!meta) {
    await seedFromJSON()
    meta = Object.fromEntries(
      Object.entries(_bookCache).map(([abbr, b]) => [abbr, Object.keys(b).length])
    )
  }

  return BOOK_META
    .filter(([abbr]) => abbr in meta!)
    .map(([abbr, name, testament]) => ({
      abbr,
      name,
      testament,
      chaptersCount: meta![abbr],
    }))
}

export async function getBibleChapter(book: string, chapter: number): Promise<BibleChapter> {
  const bookData = await loadBook(book)
  if (!bookData) throw new Error(`Libro no encontrado: ${book}`)
  const chapterData = bookData[String(chapter)]
  if (!chapterData) throw new Error(`Capítulo no encontrado: ${book} ${chapter}`)
  const verses: BibleVerse[] = Object.entries(chapterData)
    .map(([num, text]) => ({ number: Number(num), text }))
    .sort((a, b) => a.number - b.number)
  return {
    book,
    bookName: BOOK_NAME[book] ?? book,
    chapter,
    verses,
  }
}

export async function getBibleVerse(book: string, chapter: number, verse: number): Promise<string | null> {
  const bookData = await loadBook(book)
  return bookData?.[String(chapter)]?.[String(verse)] ?? null
}
