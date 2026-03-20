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

let _data: RawBible | null = null
let _loadingPromise: Promise<RawBible> | null = null

async function loadBible(): Promise<RawBible> {
  if (_data) return _data
  if (_loadingPromise) return _loadingPromise
  _loadingPromise = fetch('/data/bible_es.json')
    .then(r => {
      if (!r.ok) throw new Error(`Error cargando Biblia: ${r.status}`)
      return r.json() as Promise<RawBible>
    })
    .then(d => { _data = d; return d })
  return _loadingPromise
}

export async function getBibleBooks(): Promise<BibleBook[]> {
  const data = await loadBible()
  return BOOK_META
    .filter(([abbr]) => abbr in data)
    .map(([abbr, name, testament]) => ({
      abbr,
      name,
      testament,
      chaptersCount: Object.keys(data[abbr]).length,
    }))
}

export async function getBibleChapter(book: string, chapter: number): Promise<BibleChapter> {
  const data = await loadBible()
  const bookData = data[book]
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
  const data = await loadBible()
  return data[book]?.[String(chapter)]?.[String(verse)] ?? null
}
