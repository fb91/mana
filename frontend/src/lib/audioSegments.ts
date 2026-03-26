import { Segment } from '../hooks/useTTS'

/**
 * Segments text into meaningful chunks for TTS and highlighting.
 * 
 * Strategy:
 * - If text contains verse markers (e.g., "1 ", "2 "), split by those
 * - Otherwise, split by sentences (. ! ? followed by space or end)
 * - Minimum segment length: 3 characters
 * - Each segment includes verse number and clean text
 */
export function segmentBibleText(
  verseElements: HTMLElement[],
): Segment[] {
  const segments: Segment[] = []
  let globalIndex = 0

  for (const element of verseElements) {
    const verseNumberSpan = element.querySelector('[data-verse-number]')
    const textSpan = element.querySelector('[data-verse-text]') || element

    if (!verseNumberSpan || !textSpan) continue

    const verseNumber = verseNumberSpan.textContent?.trim() || ''
    const verseText = textSpan.textContent?.trim() || ''

    if (!verseText) continue

    // Combine verse number and text for natural reading
    const fullText = verseNumber ? `${verseNumber}. ${verseText}` : verseText

    // Split into sentences for better highlighting
    const sentences = sentenceSplit(fullText)

    for (const sentence of sentences) {
      if (sentence.trim().length < 3) continue

      segments.push({
        id: `seg-${segments.length}`,
        text: sentence,
        startIndex: globalIndex,
        endIndex: globalIndex + sentence.length,
      })

      globalIndex += sentence.length
    }
  }

  return segments
}

/**
 * Alternative: segment by full verses (no sentence splitting)
 */
export function segmentByVerse(
  verseElements: HTMLElement[],
): Segment[] {
  const segments: Segment[] = []

  for (const element of verseElements) {
    const verseNumberSpan = element.querySelector('[data-verse-number]')
    const textSpan = element.querySelector('[data-verse-text]') || element

    if (!verseNumberSpan || !textSpan) continue

    const verseNumber = verseNumberSpan.textContent?.trim() || ''
    const verseText = textSpan.textContent?.trim() || ''

    if (!verseText) continue

    const fullText = verseNumber ? `${verseNumber}. ${verseText}` : verseText

    segments.push({
      id: `verse-${segments.length}`,
      text: fullText,
      startIndex: 0,
      endIndex: fullText.length,
    })
  }

  return segments
}

/**
 * Split text by sentence boundaries.
 * Handles abbreviations gracefully.
 */
function sentenceSplit(text: string): string[] {
  // Split by sentence-ending punctuation, but keep it with the sentence
  const regex = /[^.!?]*[.!?]+(?:\s+|$)/g
  const matches = text.match(regex) || []
  return matches.map(s => s.trim()).filter(s => s.length > 0)
}

/**
 * Extracts verse elements from a container.
 * Handles different markup patterns:
 * - Pattern 1: <div><span data-verse-number>1</span><span data-verse-text>Text...</span></div>
 * - Pattern 2: <p><span class="verse-number">1</span>Text... </p>
 * - Pattern 3: <div><span>1. </span><span>Text...</span></div>
 */
export function extractVerseElements(container: HTMLElement): HTMLElement[] {
  const verses: HTMLElement[] = []

  // Try multiple selectors
  let elements = Array.from(
    container.querySelectorAll('[data-verse-number]')
  ).map(el => el.closest('[data-verse-number], p, div') as HTMLElement)

  if (elements.length === 0) {
    // Fallback: look for divs/paragraphs with verse number patterns
    elements = Array.from(
      container.querySelectorAll('p, div')
    ).filter(el => {
      const text = el.textContent || ''
      return /^\d+[\s.]/.test(text.trim())
    }) as HTMLElement[]
  }

  // Remove duplicates
  return Array.from(new Set(elements)).filter(el => el.textContent?.trim())
}

/**
 * Adds data attributes to verse elements for segmentation.
 * Modifies in-place. Returns the modified element for chaining.
 */
export function annotateVerseElements(elements: HTMLElement[]): HTMLElement[] {
  for (const element of elements) {
    // Look for verse number (usually first numeric content)
    const text = element.textContent || ''
    const numberMatch = text.match(/^(\d+)/)

    if (numberMatch && !element.querySelector('[data-verse-number]')) {
      // Create or find verse number element
      let verseSpan = element.querySelector('[data-verse-number]') as HTMLElement
      if (!verseSpan) {
        verseSpan = document.createElement('span')
        verseSpan.setAttribute('data-verse-number', numberMatch[1])
        verseSpan.textContent = numberMatch[1]
        element.prepend(verseSpan)
      }

      // Mark text element
      let textSpan = element.querySelector('[data-verse-text]') as HTMLElement
      if (!textSpan) {
        textSpan = document.createElement('span')
        textSpan.setAttribute('data-verse-text', '')
        textSpan.textContent = text.replace(/^\d+[\s.]*/, '')
        element.appendChild(textSpan)
      }
    }
  }

  return elements
}
