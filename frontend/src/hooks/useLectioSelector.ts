import { useState, useEffect } from 'react'
import type { BibleBook } from '../services/api'
import { getBibleBooks, getBibleChapter } from '../lib/bible'

export function useLectioSelector() {
  const [bibleBooks, setBibleBooks] = useState<BibleBook[]>([])
  const [selectedBook, setSelectedBook] = useState('')
  const [selectedChapter, setSelectedChapter] = useState(0)
  const [verseFrom, setVerseFrom] = useState(0)
  const [verseTo, setVerseTo] = useState(0)
  const [versesPreview, setVersesPreview] = useState<string[]>([])
  const [maxVerses, setMaxVerses] = useState(0)

  useEffect(() => {
    getBibleBooks().then(setBibleBooks)
  }, [])

  async function handleBookChange(bookAbbr: string) {
    setSelectedBook(bookAbbr)
    setSelectedChapter(0)
    setVerseFrom(0)
    setVerseTo(0)
    setVersesPreview([])
    setMaxVerses(0)
  }

  async function handleChapterChange(chapter: number) {
    setSelectedChapter(chapter)
    setVerseFrom(0)
    setVerseTo(0)
    setVersesPreview([])
    if (selectedBook && chapter > 0) {
      try {
        const chapterData = await getBibleChapter(selectedBook, chapter)
        setMaxVerses(chapterData.verses.length)
      } catch {
        setMaxVerses(0)
      }
    }
  }

  async function handleVerseChange(from: number, to: number) {
    setVerseFrom(from)
    setVerseTo(to)
    if (selectedBook && selectedChapter && from > 0 && to >= from) {
      try {
        const chapterData = await getBibleChapter(selectedBook, selectedChapter)
        const preview = chapterData.verses
          .filter(v => v.number >= from && v.number <= to)
          .map(v => `${v.number}. ${v.text}`)
        setVersesPreview(preview)
      } catch {
        setVersesPreview([])
      }
    } else {
      setVersesPreview([])
    }
  }

  return {
    bibleBooks,
    selectedBook,
    selectedChapter,
    verseFrom,
    verseTo,
    versesPreview,
    maxVerses,
    handleBookChange,
    handleChapterChange,
    handleVerseChange,
  }
}
