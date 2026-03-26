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
  const isStoppedRef = useRef(false)

  // Initialize voices
  useEffect(() => {
    const initVoices = () => {
      const voices = window.speechSynthesis.getVoices()
      console.log('[useTTS] Available voices:', voices.length, voices.map(v => v.name))
      
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
    console.log('[useTTS.stop] Stopping playback')
    isStoppedRef.current = true
    window.speechSynthesis.cancel()
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    segmentsRef.current = []
    setState(prev => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentSegmentIndex: 0,
    }))
  }, [])

  const play = useCallback(
    (segments: Segment[], startIndex = 0, onSegmentChange?: (index: number) => void) => {
      console.log('[useTTS.play] ========== START PLAYBACK ==========')
      isStoppedRef.current = false
      console.log('[useTTS.play] Segments:', segments.length)
      console.log('[useTTS.play] Start index:', startIndex)
      console.log('[useTTS.play] Available voices:', state.voices.length)
      console.log('[useTTS.play] Selected voice index:', state.selectedVoiceIndex)
      console.log('[useTTS.play] Selected voice:', state.voices[state.selectedVoiceIndex]?.name)
      console.log('[useTTS.play] Rate:', state.rate)
      
      if (window.speechSynthesis.speaking) {
        console.log('[useTTS.play] Canceling previous speech')
        window.speechSynthesis.cancel()
      }

      segmentsRef.current = segments
      if (onSegmentChange) onSegmentChangeRef.current = onSegmentChange

      const playSegment = (index: number) => {
        if (isStoppedRef.current) {
          console.log('[useTTS.playSegment] Aborted by stop flag')
          return
        }

        console.log('[useTTS.playSegment] Playing segment', index, 'of', segments.length)
        
        if (index >= segments.length) {
          console.log('[useTTS.play] ========== PLAYBACK FINISHED ==========')
          setState(prev => ({
            ...prev,
            isPlaying: false,
            isPaused: false,
          }))
          return
        }

        const segment = segments[index]
        console.log('[useTTS.playSegment] Text:', segment.text.substring(0, 80))
        
        onSegmentChangeRef.current(index)

        const utterance = new SpeechSynthesisUtterance(segment.text)
        const selectedVoice = state.voices[state.selectedVoiceIndex]
        utterance.voice = selectedVoice || null
        utterance.rate = state.rate
        utterance.lang = 'es-ES'

        console.log('[useTTS.playSegment] Created utterance, voice:', selectedVoice?.name || 'default', 'rate:', state.rate)

        utterance.onstart = () => {
          console.log('[useTTS.playSegment] onstart event fired for segment', index)
        }

        utterance.onend = () => {
          console.log('[useTTS.playSegment] onend event fired for segment', index)
          // Only continue if this is still active (not stopped)
          if (segmentsRef.current.length > 0 && index + 1 < segmentsRef.current.length) {
            playSegment(index + 1)
          } else if (segmentsRef.current.length > 0) {
            // Last segment finished normally
            setState(prev => ({
              ...prev,
              isPlaying: false,
              isPaused: false,
            }))
          }
        }

        utterance.onerror = (e) => {
          console.error('[useTTS.playSegment] onerror event:', e.error, 'for segment', index)
          playSegment(index + 1)
        }

        console.log('[useTTS.playSegment] Calling speechSynthesis.speak()')
        utteranceRef.current = utterance
        window.speechSynthesis.speak(utterance)
        console.log('[useTTS.playSegment] speechSynthesis.speaking:', window.speechSynthesis.speaking)
      }

      setState(prev => ({
        ...prev,
        isPlaying: true,
        isPaused: false,
        currentSegmentIndex: startIndex,
      }))

      playSegment(startIndex)
    },
    [state.selectedVoiceIndex, state.rate, state.voices]
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
