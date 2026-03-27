import { useState, useEffect } from 'react'
import type { LectioBiblicaResponse } from '../services/api'
import { api } from '../services/api'
import { getBibleChapter, getBibleVerse as _getBibleVerse, BOOK_NAME } from '../lib/bible'
import { downloadLectioPDF } from '../lib/lectio-pdf'

function DownloadPDFButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-center gap-2.5
                 border border-dorado/40 text-dorado rounded-2xl py-3 px-4
                 hover:bg-dorado/10 active:scale-[0.98]
                 transition-all duration-150 group"
    >
      <svg
        className="w-4 h-4 text-dorado group-hover:translate-y-0.5 transition-transform duration-150"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round"
          d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
      </svg>
      <span className="text-sm font-medium">Descargar Lectio en PDF</span>
    </button>
  )
}

function LectioSection({ titulo, color, children }: { titulo: string; color: 'dorado' | 'cafe'; children: React.ReactNode }) {
  const border = color === 'dorado' ? 'border-dorado/40' : 'border-cafe-light/40'
  return (
    <div className={`border-l-2 ${border} pl-4`}>
      <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wider mb-2">{titulo}</p>
      {children}
    </div>
  )
}

interface LectioModalProps {
  book: string
  chapter: number
  verseFrom: number
  verseTo: number
  onClose: () => void
}

export default function LectioModal({ book, chapter, verseFrom, verseTo, onClose }: LectioModalProps) {
  const [loading, setLoading] = useState(true)
  const [result, setResult] = useState<LectioBiblicaResponse | null>(null)
  const [error, setError] = useState('')
  const [verses, setVerses] = useState<{ number: number; text: string }[]>([])

  useEffect(() => {
    async function loadLectio() {
      try {
        const chapterData = await getBibleChapter(book, chapter)
        const selectedVerses = chapterData.verses.filter(v => v.number >= verseFrom && v.number <= verseTo)
        setVerses(selectedVerses)

        const verseNumbers = selectedVerses.map(v => v.number)
        const verseTexts = selectedVerses.map(v => v.text)
        const bookName = BOOK_NAME[book] || book

        const lectioResult = await api.getLectioBiblica(book, bookName, chapter, verseNumbers, verseTexts)
        setResult(lectioResult)
      } catch {
        setError('No se pudo preparar la Lectio. Intentá de nuevo.')
      } finally {
        setLoading(false)
      }
    }
    loadLectio()
  }, [book, chapter, verseFrom, verseTo])

  const bookName = BOOK_NAME[book] || book
  const versoLabel = verseFrom === verseTo
    ? `${bookName} ${chapter}:${verseFrom}`
    : `${bookName} ${chapter}:${verseFrom}-${verseTo}`

  function handleDownloadPDF() {
    if (!result) return
    downloadLectioPDF(result, { book, bookName, chapter, verses }, verses.map(v => v.number))
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end lg:items-center lg:justify-center lg:p-8">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-crema dark:bg-oscuro-bg rounded-t-3xl lg:rounded-3xl px-5 pt-5 pb-8
                      w-full lg:max-w-2xl max-h-[92vh] overflow-y-auto animate-slide-up shadow-2xl">
        <div className="lg:hidden w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />

        <div className="flex items-center justify-between mb-1">
          <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200">
            Lectio Divina
          </h2>
          <button onClick={onClose} className="text-cafe-light dark:text-crema-300 text-sm py-1 px-2">
            cerrar ✕
          </button>
        </div>
        <p className="text-dorado text-sm font-medium mb-4">{versoLabel}</p>

        <div className="bg-dorado/10 dark:bg-dorado/15 border border-dorado/30 rounded-2xl p-4 mb-6">
          <div className="space-y-2">
            {verses.map(verse => (
              <p key={verse.number} className="font-serif text-[15px] text-cafe-dark dark:text-crema-200 leading-relaxed">
                <span className="text-dorado font-bold text-xs mr-2 align-top leading-6 select-none">
                  {verse.number}
                </span>
                {verse.text}
              </p>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-12 gap-4 animate-pulse-soft">
            <span className="text-5xl">🕯️</span>
            <p className="text-sm text-cafe-light dark:text-crema-300">Preparando tu Lectio Divina...</p>
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-8">{error}</p>
        ) : result ? (
          <div className="space-y-6 animate-fade-in">
            <DownloadPDFButton onClick={handleDownloadPDF} />
            <LectioSection titulo="Lectio · Leer" color="dorado">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.lectio}</p>
            </LectioSection>
            <LectioSection titulo="Meditatio · Meditar" color="cafe">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed mb-3">{result.meditatioIntro}</p>
              <ul className="space-y-2">
                {result.meditatioPreguntas.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm text-cafe-dark dark:text-crema-200">
                    <span className="text-dorado font-bold mt-0.5 shrink-0">{i + 1}.</span>
                    <span className="leading-relaxed">{q}</span>
                  </li>
                ))}
              </ul>
            </LectioSection>
            <LectioSection titulo="Oratio · Orar" color="dorado">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.oratio}</p>
            </LectioSection>
            <LectioSection titulo="Contemplatio · Contemplar" color="cafe">
              <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">{result.contemplatio}</p>
            </LectioSection>
            <DownloadPDFButton onClick={handleDownloadPDF} />
            <button
              onClick={onClose}
              className="w-full text-center text-sm text-cafe-light dark:text-crema-300 py-2
                         active:scale-[0.98] transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
