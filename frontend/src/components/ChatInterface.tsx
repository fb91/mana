import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { ChatMessage } from '../services/api'

interface Props {
  messages: ChatMessage[]
  onSend: (text: string) => void
  loading: boolean
  placeholder?: string
  disabled?: boolean
}

export default function ChatInterface({
  messages,
  onSend,
  loading,
  placeholder = 'Escribí tu respuesta...',
  disabled = false,
}: Props) {
  const [input, setInput] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = () => {
    const text = input.trim()
    if (!text || loading || disabled) return
    setInput('')
    onSend(text)
    // Auto-resize textarea reset
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInput = () => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 120) + 'px'
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex animate-slide-up ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <span className="text-lg mr-2 flex-shrink-0 mt-1">🕊️</span>
            )}
            <div className={msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-assistant'}>
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start animate-fade-in">
            <span className="text-lg mr-2 flex-shrink-0 mt-1">🕊️</span>
            <div className="chat-bubble-assistant">
              <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 bg-dorado rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-dorado rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-dorado rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {!disabled && (
        <div className="border-t border-crema-200 dark:border-oscuro-border p-3 bg-white/80 dark:bg-oscuro-surface/80 backdrop-blur-sm">
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              onInput={handleInput}
              placeholder={placeholder}
              rows={1}
              className="input-field resize-none flex-1 py-2.5 text-sm"
              style={{ minHeight: '44px' }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className="btn-primary py-2.5 px-4 text-sm flex-shrink-0"
            >
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
