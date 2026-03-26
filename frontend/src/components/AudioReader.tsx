import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from './Icon'
import { useTTS, Segment } from '../hooks/useTTS'

export interface AudioReaderProps {
  containerRef: React.RefObject<HTMLDivElement>
  onClose: () => void
}

export default function AudioReader({
  containerRef,
  onClose,
}: AudioReaderProps) {
  const { state, play, pause, resume, stop, setVoice, setRate } = useTTS()
  const [segments, setSegments] = useState<Segment[]>([])
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const [showVoiceMenu, setShowVoiceMenu] = useState(false)
  const highlightedSpanRef = useRef<HTMLElement | null>(null)

  // Initialize segments by finding verse elements in the container
  useEffect(() => {
    if (!containerRef.current) {
      console.log('[AudioReader] containerRef is null!')
      return
    }

    console.log('[AudioReader] Container ref available, extracting segments...')

    const extractSegments = () => {
      const segs: Segment[] = []
      const container = containerRef.current!

      console.log('[AudioReader] Container content:', container.innerHTML.substring(0, 200))

      // Find all verse divs - match BibliaPage structure
      const verseElements = container.querySelectorAll('div[onClick], p')
      console.log('[AudioReader] Found verse elements with onClick or p:', verseElements.length)

      // If that didn't work, try all divs/p with substantial text
      let elements = Array.from(verseElements)
      if (elements.length === 0) {
        const allElements = container.querySelectorAll('div, p')
        elements = Array.from(allElements).filter(el => (el.textContent?.length || 0) > 10)
        console.log('[AudioReader] Fallback: found div/p with text:', elements.length)
      }

      for (const element of elements) {
        const textContent = element.textContent?.trim() || ''
        console.log('[AudioReader] Processing element with text length:', textContent.length, 'preview:', textContent.substring(0, 50))

        if (textContent.length < 5) {
          console.log('[AudioReader] Skipping: too short')
          continue
        }

        // Skip elements that don't contain Spanish text
        if (!/[a-záéíóúñA-ZÁÉÍÓÚÑ]/.test(textContent)) {
          console.log('[AudioReader] Skipping: no Spanish text')
          continue
        }

        let verseText = textContent

        // Try to extract just the verse text (not the number)
        const spans = element.querySelectorAll('span')
        if (spans.length > 0) {
          // Find the span with the most text (that's the actual verse)
          let maxSpan = spans[0]
          for (const span of Array.from(spans)) {
            if ((span.textContent?.length || 0) > (maxSpan.textContent?.length || 0)) {
              maxSpan = span
            }
          }
          const spanText = maxSpan.textContent?.trim()
          if (spanText && spanText.length > 5) {
            verseText = spanText
            console.log('[AudioReader] Extracted from longest span')
          }
        }

        // Remove verse numbers from the start (e.g., "1 " or "123 " or "1. ")
        verseText = verseText.replace(/^\d+[\s.,:;]+/, '')

        // Segment into sentences
        const sentences = splitBySentences(verseText)
        console.log('[AudioReader] Split into', sentences.length, 'sentences')

        for (const sentence of sentences) {
          let trimmed = sentence.trim()
          // Remove verse numbers from each sentence too (e.g., "52 Los judíos..." -> "Los judíos...")
          trimmed = trimmed.replace(/^\d+[\s.,:;]+/, '')
          if (trimmed.length < 3) continue

          segs.push({
            id: `seg-${segs.length}`,
            text: trimmed,
            startIndex: 0,
            endIndex: trimmed.length,
          })
        }
      }

      return segs
    }

    const newSegments = extractSegments()
    console.log('[AudioReader] ========== EXTRACTION COMPLETE ==========')
    console.log('[AudioReader] Total segments extracted:', newSegments.length)
    if (newSegments.length > 0) {
      console.log('[AudioReader] First segment:', newSegments[0].text.substring(0, 50))
      console.log('[AudioReader] Last segment:', newSegments[newSegments.length - 1].text.substring(0, 50))
    }
    setSegments(newSegments)
  }, [containerRef])

  // Split text into sentences
  const splitBySentences = (text: string): string[] => {
    // Match sentence-like patterns, handling abbreviations better
    const sentences = text.match(/[^.!?]*[.!?]+(?=\s|$)/g) || [text]
    return sentences.filter(s => s.trim().length > 0)
  }

  // Handle highlight of current segment - improved version
  const onSegmentChange = useCallback(
    (index: number) => {
      // Remove previous highlight
      if (highlightedSpanRef.current) {
        highlightedSpanRef.current.classList.remove('audio-highlight')
        ;(highlightedSpanRef.current as HTMLElement).style.backgroundColor = ''
      }

      if (index < segments.length && containerRef.current) {
        const segment = segments[index]
        const container = containerRef.current

        // Find all verse elements and search for the one containing this segment text
        const verseElements = container.querySelectorAll('div, p')
        for (const element of Array.from(verseElements)) {
          const textContent = element.textContent || ''
          // Check if this element contains the segment text
          if (textContent.includes(segment.text.substring(0, 20))) {
            element.classList.add('audio-highlight')
            ;(element as HTMLElement).style.backgroundColor = 'rgba(218, 165, 32, 0.15)'
            highlightedSpanRef.current = element as HTMLElement
            // Scroll into view
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            break
          }
        }
      }

      setHighlightedIndex(index)
    },
    [segments, containerRef]
  )

  // Handle play/resume
  const handlePlay = useCallback(() => {
    console.log('[AudioReader] handlePlay called, segments:', segments.length)
    if (segments.length === 0) {
      console.warn('[AudioReader] No segments to play')
      return
    }

    const startIndex =
      state.isPlaying && state.isPaused ? state.currentSegmentIndex : 0

    console.log('[AudioReader] Starting playback from index:', startIndex, 'total voices:', state.voices.length)
    play(segments, startIndex, onSegmentChange)
  }, [segments, state.isPlaying, state.isPaused, state.currentSegmentIndex, play, onSegmentChange, state.voices.length])

  const handleStop = useCallback(() => {
    stop()

    // Clear highlight
    if (highlightedSpanRef.current) {
      highlightedSpanRef.current.classList.remove('audio-highlight')
      highlightedSpanRef.current = null
    }

    setHighlightedIndex(-1)
  }, [stop])

  const handleSpeedChange = useCallback(
    (delta: number) => {
      const newRate = state.rate + delta
      setRate(newRate)
    },
    [state.rate, setRate]
  )

  // Debug: log when segments change
  useEffect(() => {
    if (segments.length === 0) {
      console.log('[AudioReader] No segments found in container')
    } else {
      console.log('[AudioReader] Ready with', segments.length, 'segments')
    }
  }, [segments])

  const selectedVoiceName =
    state.voices[state.selectedVoiceIndex]?.name || 'Voz predeterminada'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-white dark:bg-oscuro-surface shadow-2xl border-t border-crema-200 dark:border-oscuro-border animate-slide-up">
      <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
        {/* Row 1: Title + Close */}
        <div className="flex items-center justify-between mb-3 sticky top-0 bg-white dark:bg-oscuro-surface">
          <div className="flex items-center gap-2">
            <Icon name="speaker" size={18} className="text-dorado" />
            <span className="text-sm font-semibold text-cafe-dark dark:text-crema-200">
              Escuchar
            </span>
          </div>
          <button
            onClick={() => {
              stop()
              onClose()
            }}
            className="text-xs font-medium px-3 py-1 rounded bg-crema-100 dark:bg-oscuro-border text-cafe-dark dark:text-crema-200 hover:bg-crema-200 dark:hover:bg-oscuro-border/80 transition-colors"
          >
            Cerrar
          </button>
        </div>

        {/* Row 2: Controls */}
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          {/* Play button */}
          <button
            onClick={handlePlay}
            disabled={segments.length === 0}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-dorado hover:bg-dorado-dark
                       disabled:opacity-50 text-crema-50 flex items-center justify-center
                       transition-colors active:scale-95"
            title="Reproducir"
          >
            <Icon
              name={state.isPlaying && !state.isPaused ? 'minus' : 'play'}
              size={18}
            />
          </button>

          {/* Stop button */}
          {state.isPlaying && (
            <button
              onClick={handleStop}
              className="flex-shrink-0 w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/30
                         text-rose-600 dark:text-rose-400 flex items-center justify-center
                         hover:bg-rose-200 dark:hover:bg-rose-900/50 transition-colors active:scale-95"
              title="Detener"
            >
              <Icon name="stop" size={16} />
            </button>
          )}

          {/* Voice selector */}
          <div className="relative flex-1 min-w-fit">
            <button
              onClick={() => setShowVoiceMenu(!showVoiceMenu)}
              className="px-3 py-2 rounded-xl bg-crema-100 dark:bg-oscuro-border
                         text-xs text-cafe-dark dark:text-crema-200 hover:bg-crema-200
                         dark:hover:bg-oscuro-border/80 transition-colors truncate
                         flex items-center justify-between gap-1"
            >
              <span className="truncate max-w-xs">{selectedVoiceName}</span>
              <Icon
                name={showVoiceMenu ? 'chevron-up' : 'chevron-down'}
                size={12}
              />
            </button>

            {/* Voice dropdown */}
            {showVoiceMenu && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-oscuro-surface
                              border border-crema-200 dark:border-oscuro-border rounded-xl shadow-lg
                              max-h-40 overflow-y-auto z-20">
                {state.voices.map((voice, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setVoice(idx)
                      setShowVoiceMenu(false)
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors
                      ${state.selectedVoiceIndex === idx
                        ? 'bg-dorado/20 dark:bg-dorado/10 text-dorado font-medium'
                        : 'text-cafe-dark dark:text-crema-200 hover:bg-crema-100 dark:hover:bg-oscuro-border'
                      }`}
                  >
                    {voice.name.split(' ')[0]} {voice.lang}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Speed controls */}
          <div className="flex items-center gap-1 bg-crema-100 dark:bg-oscuro-border rounded-xl p-1">
            <button
              onClick={() => handleSpeedChange(-0.25)}
              disabled={state.rate <= 0.5}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-crema-200 dark:hover:bg-oscuro-surface active:scale-90
                         text-cafe-dark dark:text-crema-200 text-xs font-bold"
            >
              −
            </button>
            <span className="text-xs font-semibold text-cafe-dark dark:text-crema-200 w-7 text-center">
              {state.rate.toFixed(1)}x
            </span>
            <button
              onClick={() => handleSpeedChange(0.25)}
              disabled={state.rate >= 2}
              className="w-6 h-6 rounded flex items-center justify-center transition-colors
                         disabled:opacity-30 disabled:cursor-not-allowed
                         hover:bg-crema-200 dark:hover:bg-oscuro-surface active:scale-90
                         text-cafe-dark dark:text-crema-200 text-xs font-bold"
            >
              +
            </button>
          </div>
        </div>

        {/* Progress text */}
        {state.isPlaying && segments.length > 0 && (
          <div className="text-xs text-cafe-light dark:text-crema-400 text-center">
            Segmento {highlightedIndex + 1} de {segments.length}
          </div>
        )}
      </div>
    </div>
  )
}
