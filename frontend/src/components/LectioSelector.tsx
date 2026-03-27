import type { BibleBook } from '../services/api'

interface Props {
  bibleBooks: BibleBook[]
  selectedBook: string
  selectedChapter: number
  verseFrom: number
  verseTo: number
  versesPreview: string[]
  maxVerses: number
  onBookChange: (book: string) => void
  onChapterChange: (chapter: number) => void
  onVerseChange: (from: number, to: number) => void
  onStart: () => void
}

export default function LectioSelector({
  bibleBooks,
  selectedBook,
  selectedChapter,
  verseFrom,
  verseTo,
  versesPreview,
  maxVerses,
  onBookChange,
  onChapterChange,
  onVerseChange,
  onStart,
}: Props) {
  return (
    <div className="bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                    border-t-0 rounded-b-2xl px-5 py-5 animate-fade-in">
      <h3 className="font-serif font-semibold text-cafe-dark dark:text-crema-200 mb-3">
        Seleccioná un pasaje
      </h3>

      <div className="mb-3">
        <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-1 block">
          Libro
        </label>
        <select
          value={selectedBook}
          onChange={e => onBookChange(e.target.value)}
          className="input-field text-sm w-full"
        >
          <option value="">Seleccionar libro...</option>
          <optgroup label="ANTIGUO TESTAMENTO">
            {bibleBooks.filter(b => b.testament === 'AT').map(book => (
              <option key={book.abbr} value={book.abbr}>{book.name}</option>
            ))}
          </optgroup>
          <optgroup label="NUEVO TESTAMENTO">
            {bibleBooks.filter(b => b.testament === 'NT').map(book => (
              <option key={book.abbr} value={book.abbr}>{book.name}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {selectedBook && (
        <div className="mb-3">
          <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-1 block">
            Capítulo
          </label>
          <select
            value={selectedChapter}
            onChange={e => onChapterChange(Number(e.target.value))}
            className="input-field text-sm w-full"
          >
            <option value="0">Seleccionar capítulo...</option>
            {Array.from(
              { length: bibleBooks.find(b => b.abbr === selectedBook)?.chaptersCount || 0 },
              (_, i) => i + 1
            ).map(ch => (
              <option key={ch} value={ch}>Capítulo {ch}</option>
            ))}
          </select>
        </div>
      )}

      {selectedChapter > 0 && maxVerses > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-1 block">
                Desde versículo
              </label>
              <select
                value={verseFrom}
                onChange={e => onVerseChange(Number(e.target.value), verseTo)}
                className="input-field text-sm w-full"
              >
                <option value="0">--</option>
                {Array.from({ length: maxVerses }, (_, i) => i + 1).map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-1 block">
                Hasta versículo
              </label>
              <select
                value={verseTo}
                onChange={e => onVerseChange(verseFrom, Number(e.target.value))}
                className="input-field text-sm w-full"
                disabled={verseFrom === 0}
              >
                <option value="0">--</option>
                {Array.from({ length: maxVerses }, (_, i) => i + 1)
                  .filter(v => v >= verseFrom)
                  .map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
              </select>
            </div>
          </div>

          {versesPreview.length > 0 && (
            <div className="mb-3 p-3 rounded-2xl bg-crema-100 dark:bg-oscuro-bg max-h-48 overflow-y-auto">
              <p className="text-xs font-semibold text-dorado mb-2">Vista previa:</p>
              {versesPreview.map((verse, i) => (
                <p key={i} className="text-xs text-cafe-dark dark:text-crema-200 leading-relaxed mb-1">
                  {verse}
                </p>
              ))}
            </div>
          )}

          <button
            onClick={onStart}
            disabled={!verseFrom || !verseTo}
            className="btn-primary w-full"
          >
            Generar Lectio Divina
          </button>
        </>
      )}
    </div>
  )
}
