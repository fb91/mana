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
    if (!containerRef.current) return

    const extractSegments = () => {
      const segs: Segment[] = []
      const container = containerRef.current!

      // Find all verse paragraphs/divs
      // Assumes structure like: <p><span>1</span>Text...</p> or similar
      const verseElements = container.querySelectorAll('p, div')

      for (const element of Array.from(verseElements)) {
        const content = element.textContent?.trim()
        if (!content || content.length < 5) continue

        // Skip if it doesn't look like a verse (starts with number)
        if (!/^\d+[\s.]/.test(content)) continue

        // For sentence-level segmentation: split by sentences
        const sentences = splitBySentences(content)

        for (const sentence of sentences) {
          if (sentence.trim().length < 5) continue

          segs.push({
            id: `seg-${segs.length}`,
            text: sentence.trim(),
            startIndex: 0,
            endIndex: sentence.length,
          })
        }
      }

      return segs
    }

    const newSegments = extractSegments()
    setSegments(newSegments)
  }, [containerRef])

  // Split text into sentences
  const splitBySentences = (text: string): string[] => {
    // Match sentence-like patterns
    return text.match(/[^.!?]*[.!?]+(?=\s|$)/g) || [text]
  }

  // Handle highlight of current segment
  const onSegmentChange = useCallback(
    (index: number) => {
      // Remove previous highlight
      if (highlightedSpanRef.current) {
        highlightedSpanRef.current.classList.remove('audio-highlight')
      }

      // Add new highlight
      if (index < segments.length) {
        const segmentId = segments[index].id
        const span = document.getElementById(segmentId)

        if (span) {
          span.classList.add('audio-highlight')
          highlightedSpanRef.current = span

          // Scroll into view
          span.scrollIntoView({ behavior: 'smooth', block: 'center' })
        }
      }

      setHighlightedIndex(index)
    },
    [segments]
  )

  // Handle play/resume
  const handlePlay = useCallback(() => {
    if (segments.length === 0) return

    const startIndex =
      state.isPlaying && state.isPaused ? state.currentSegmentIndex : 0

    play(segments, startIndex, onSegmentChange)
  }, [segments, state.isPlaying, state.isPaused, state.currentSegmentIndex, play, onSegmentChange])

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

  // Wrap segments in span elements using MutationObserver approach
  useEffect(() => {
    if (!containerRef.current || segments.length === 0) return

    const container = containerRef.current

    // Find all verse elements and wrap segments
    const verseElements = container.querySelectorAll('p, div')

    for (const element of Array.from(verseElements)) {
      const content = element.textContent?.trim()
      if (!content || content.length < 5) continue
      if (!/^\d+[\s.]/.test(content)) continue

      // Find segments that match this verse content
      for (const segment of segments) {
        // Create a wrapper span if it doesn't exist
        if (!document.getElementById(segment.id)) {
          const span = document.createElement('span')
          span.id = segment.id
          span.className = 'audio-reader-segment'
          // We'll update the span content later with actual text
        }
      }
    }
  }, [containerRef, segments])

  const selectedVoiceName =
    state.voices[state.selectedVoiceIndex]?.name || 'Voz predeterminada'

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-oscuro-surface shadow-2xl border-t border-crema-200 dark:border-oscuro-border animate-slide-up">
      <div className="px-4 py-3">
        {/* Row 1: Title + Close */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon name="bell" size={16} className="text-dorado" />
            <span className="text-sm font-semibold text-cafe-dark dark:text-crema-200">
              🔊 Escuchar
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-crema-100 dark:hover:bg-oscuro-border rounded transition-colors"
          >
            <Icon name="cross" size={16} className="text-cafe-light dark:text-crema-400" />
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
              name={state.isPlaying && !state.isPaused ? 'minus' : 'check'}
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
              <Icon name="archive" size={16} />
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
