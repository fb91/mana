import { useState, useEffect, useRef, useCallback } from 'react'

export interface Segment {
  id: string
  text: string
  startIndex: number
  endIndex: number
}

export interface TTSState {
  isPlaying: boolean
  isPaused: boolean
  currentSegmentIndex: number
  voices: SpeechSynthesisVoice[]
  selectedVoiceIndex: number
  rate: number
}

const SPANISH_VOICE_KEYWORDS = ['es-', 'spanish', 'español']

function isSpanishVoice(voice: SpeechSynthesisVoice): boolean {
  const lower = (voice.lang + ' ' + (voice.name || '')).toLowerCase()
  return SPANISH_VOICE_KEYWORDS.some(k => lower.includes(k))
}

export function useTTS() {
  const [state, setState] = useState<TTSState>({
    isPlaying: false,
    isPaused: false,
    currentSegmentIndex: 0,
    voices: [],
    selectedVoiceIndex: 0,
    rate: 1,
  })

  const segmentsRef = useRef<Segment[]>([])
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSegmentChangeRef = useRef<(index: number) => void>(() => {})

  // Initialize voices
  useEffect(() => {
    const initVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      
      // Sort: Spanish voices first, then others
      const sorted = [...voices].sort((a, b) => {
        const aIsSpanish = isSpanishVoice(a)
        const bIsSpanish = isSpanishVoice(b)
        if (aIsSpanish && !bIsSpanish) return -1
        if (!aIsSpanish && bIsSpanish) return 1
        return 0
      })

      setState(prev => ({
        ...prev,
        voices: sorted,
        selectedVoiceIndex: 0,
      }))
    }

    // Voices may not be loaded immediately
    if (window.speechSynthesis.getVoices().length > 0) {
      initVoices()
    }

    window.speechSynthesis.onvoiceschanged = initVoices
    return () => {
      window.speechSynthesis.onvoiceschanged = null
    }
  }, [])

  const stop = useCallback(() => {
    window.speechSynthesis.cancel()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
    }))
  }, [])

  const play = useCallback(
    (segments: Segment[], startIndex = 0, onSegmentChange?: (index: number) => void) => {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel()
      }

      segmentsRef.current = segments
      if (onSegmentChange) onSegmentChangeRef.current = onSegmentChange

      const playSegment = (index: number) => {
        if (index >= segments.length) {
          setState(prev => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
          }))
          return
        }

        const segment = segments[index]
        onSegmentChangeRef.current(index)

        const utterance = new SpeechSynthesisUtterance(segment.text)
        utterance.voice = state.voices[state.selectedVoiceIndex] || null
        utterance.rate = state.rate
        utterance.lang = 'es-ES'

        utterance.onend = () => {
          playSegment(index + 1)
        }

        utterance.onerror = () => {
          playSegment(index + 1)
        }

        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
      }

      setState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        currentSegmentIndex: startIndex,
      }))

      playSegment(startIndex)
    },
    [state.selectedVoiceIndex, state.rate]
  )

  const pause = useCallback(() => {
    window.speechSynthesis.pause()
    setState(prev => ({
      ...prev,
      isPaused: true,
    }))
  }, [])

  const resume = useCallback(() => {
    window.speechSynthesis.resume()
    setState(prev => ({
      ...prev,
      isPaused: false,
    }))
  }, [])

  const setVoice = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedVoiceIndex: index,
    }))
  }, [])

  const setRate = useCallback((rate: number) => {
    setState(prev => ({
      ...prev,
      rate: Math.max(0.5, Math.min(2, rate)),
    }))
  }, [])

  return {
    state,
    play,
    pause,
    resume,
    stop,
    setVoice,
    setRate,
  }
}
