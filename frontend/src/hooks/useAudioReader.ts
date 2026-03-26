import { useState, useRef, useEffect } from 'react'

/**
 * Hook to manage audio reader state and show/hide logic
 * Usage in a page:
 * const { isOpen, open, close } = useAudioReader()
 */
export function useAudioReader() {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const open = () => setIsOpen(true)
  const close = () => setIsOpen(false)

  return {
    isOpen,
    open,
    close,
    containerRef,
  }
}
