import jsPDF from 'jspdf'
import type { LectioBiblicaResponse, BibleChapter } from '../services/api'

// Colors (RGB)
const DORADO: [number, number, number] = [139, 105, 20]
const CAFE:   [number, number, number] = [74,  42,  14]
const GRIS:   [number, number, number] = [130, 110, 90]
const CREMA:  [number, number, number] = [250, 246, 232]

export function downloadLectioPDF(
  result: LectioBiblicaResponse,
  chapter: BibleChapter,
  selectedVerses: number[],
) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const PW = doc.internal.pageSize.getWidth()
  const PH = doc.internal.pageSize.getHeight()
  const ML = 20   // left margin
  const MR = 20   // right margin
  const MT = 18   // top margin
  const MB = 14   // bottom margin
  const CW = PW - ML - MR

  let y = MT

  // ── Helpers ────────────────────────────────────────────────────────────────

  function newPageIfNeeded(needed = 12) {
    if (y + needed > PH - MB) {
      doc.addPage()
      y = MT
    }
  }

  function writeLine(
    str: string,
    x: number,
    fontSize: number,
    style: 'normal' | 'bold' | 'italic' | 'bolditalic' = 'normal',
    color: [number, number, number] = CAFE,
    maxWidth = CW,
  ) {
    doc.setFontSize(fontSize)
    doc.setFont('helvetica', style)
    doc.setTextColor(...color)
    const lines = doc.splitTextToSize(str, maxWidth) as string[]
    for (const line of lines) {
      newPageIfNeeded(fontSize * 0.5)
      doc.text(line, x, y)
      y += fontSize * 0.48
    }
  }

  function hRule(color: [number, number, number] = DORADO, weight = 0.3, gap = 3) {
    doc.setDrawColor(...color)
    doc.setLineWidth(weight)
    doc.line(ML, y, PW - MR, y)
    y += gap
  }

  function sectionTitle(label: string) {
    newPageIfNeeded(18)
    y += 5
    writeLine(label.toUpperCase(), ML, 8, 'bold', DORADO)
    y += 0.5
    hRule(DORADO, 0.2, 4)
  }

  function numberedList(items: string[], fontSize = 10.5) {
    items.forEach((item, i) => {
      newPageIfNeeded(14)
      const lines = doc.splitTextToSize(item, CW - 7) as string[]
      // Number
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DORADO)
      doc.text(`${i + 1}.`, ML, y)
      // Text
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...CAFE)
      for (let j = 0; j < lines.length; j++) {
        if (j > 0) newPageIfNeeded(fontSize * 0.5)
        doc.text(lines[j], ML + 6, y)
        y += fontSize * 0.48
      }
      y += 1.5
    })
  }

  function bulletList(items: string[], fontSize = 10.5) {
    items.forEach(item => {
      newPageIfNeeded(14)
      const lines = doc.splitTextToSize(item, CW - 7) as string[]
      doc.setFontSize(fontSize)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...DORADO)
      doc.text('›', ML, y)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(...CAFE)
      for (let j = 0; j < lines.length; j++) {
        if (j > 0) newPageIfNeeded(fontSize * 0.5)
        doc.text(lines[j], ML + 6, y)
        y += fontSize * 0.48
      }
      y += 1.5
    })
  }

  // ── Page header (repeated on each page) ────────────────────────────────────

  function drawPageHeader() {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...DORADO)
    doc.text('MANÁ', ML, MT - 5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text('Lectio Divina · ' + result.pasaje, PW / 2, MT - 5, { align: 'center' })
    doc.setDrawColor(...DORADO)
    doc.setLineWidth(0.2)
    doc.line(ML, MT - 3, PW - MR, MT - 3)
  }

  // ── Cover block ────────────────────────────────────────────────────────────

  // App name + date
  const fecha = new Date().toLocaleDateString('es-AR', {
    year: 'numeric', month: 'long', day: 'numeric',
  })
  doc.setFontSize(9)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...DORADO)
  doc.text('MANÁ', ML, y)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...GRIS)
  doc.setFontSize(8)
  doc.text(fecha, PW - MR, y, { align: 'right' })
  y += 5

  hRule(DORADO, 0.5, 5)

  writeLine('Lectio Divina', ML, 22, 'bold', CAFE)
  y += 1
  writeLine(result.pasaje, ML, 13, 'normal', DORADO)
  y += 4

  hRule(DORADO, 0.5, 5)

  // ── Verse block ────────────────────────────────────────────────────────────

  // Pre-measure height to draw background
  const verseData = selectedVerses
    .map(n => chapter.verses.find(v => v.number === n))
    .filter(Boolean) as { number: number; text: string }[]

  doc.setFontSize(11)
  let verseBlockH = 8 // padding top + bottom
  for (const v of verseData) {
    const lines = doc.splitTextToSize(`${v.number}  ${v.text}`, CW - 8) as string[]
    verseBlockH += lines.length * 11 * 0.48 + 2
  }

  newPageIfNeeded(verseBlockH)

  // Background
  doc.setFillColor(...CREMA)
  doc.roundedRect(ML, y, CW, verseBlockH, 2.5, 2.5, 'F')
  doc.setDrawColor(...DORADO)
  doc.setLineWidth(0.35)
  doc.roundedRect(ML, y, CW, verseBlockH, 2.5, 2.5, 'S')

  y += 5
  for (const v of verseData) {
    const raw = `${v.number}  ${v.text}`
    const lines = doc.splitTextToSize(raw, CW - 8) as string[]
    doc.setFontSize(11)
    doc.setFont('helvetica', 'italic')
    doc.setTextColor(...CAFE)
    for (const line of lines) {
      doc.text(line, ML + 4, y)
      y += 11 * 0.48
    }
    y += 2
  }
  y += 3

  // ── Lectio sections ────────────────────────────────────────────────────────

  sectionTitle('Lectio · Leer')
  writeLine(result.lectio, ML, 10.5)

  sectionTitle('Meditatio · Meditar')
  writeLine(result.meditatioIntro, ML, 10.5)
  y += 2
  numberedList(result.meditatioPreguntas)

  sectionTitle('Oratio · Orar')
  writeLine(result.oratio, ML, 10.5)

  sectionTitle('Contemplatio · Contemplar')
  writeLine(result.contemplatio, ML, 10.5)

  // ── Preguntas para profundizar ─────────────────────────────────────────────

  // ── Footer on every page ───────────────────────────────────────────────────

  const totalPages = doc.getNumberOfPages()
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p)
    if (p > 1) drawPageHeader()
    doc.setFontSize(7.5)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(...GRIS)
    doc.text(
      'Generado con Maná · aplicación espiritual católica',
      PW / 2,
      PH - 6,
      { align: 'center' },
    )
    if (totalPages > 1) {
      doc.text(`${p} / ${totalPages}`, PW - MR, PH - 6, { align: 'right' })
    }
  }

  const safeName = result.pasaje.replace(/[^a-zA-Z0-9 ]/g, '').trim().replace(/\s+/g, '-')
  doc.save(`Lectio-Divina-${safeName}.pdf`)
}
