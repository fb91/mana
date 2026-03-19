import { useState, useRef, useEffect } from 'react'
import RichText from './RichText'

export interface ConvTurn {
  question: string     // AI text shown at this step
  opciones: string[]   // options offered
  answer: string       // user's selected/typed answer
}

interface Props {
  currentQuestion: string
  currentOpciones: string[]
  turns: ConvTurn[]
  loading: boolean
  onAnswer: (answer: string) => void
  onRedo: (index: number) => void
  icon?: string
  placeholder?: string
}

const FREE_TEXT_TRIGGERS = [
  'Prefiero escribir mi propia respuesta',
  'Quiero escribir mi propia respuesta',
  'Tengo otra pregunta',
]

function isFreeTextTrigger(option: string) {
  return FREE_TEXT_TRIGGERS.some(t => option.toLowerCase().includes(t.toLowerCase()))
}

export default function ConversationalInterface({
  currentQuestion,
  currentOpciones,
  turns,
  loading,
  onAnswer,
  onRedo,
  icon = '🕊️',
  placeholder = 'Escribí tu respuesta...',
}: Props) {
  const [freeText, setFreeText] = useState('')
  const [showFreeText, setShowFreeText] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  // Reset free text when a new question arrives
  useEffect(() => {
    setFreeText('')
    setShowFreeText(false)
  }, [currentQuestion])

  // Scroll to bottom when question or loading state changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [currentQuestion, loading])

  useEffect(() => {
    if (showFreeText) textareaRef.current?.focus()
  }, [showFreeText])

  const handleOptionClick = (option: string) => {
    if (isFreeTextTrigger(option)) {
      setShowFreeText(true)
    } else {
      onAnswer(option)
    }
  }

  const handleFreeTextSubmit = () => {
    const text = freeText.trim()
    if (!text) return
    setFreeText('')
    setShowFreeText(false)
    onAnswer(text)
  }

  return (
    <div className="flex flex-col h-full">

      {/* Pinned history */}
      {turns.length > 0 && (
        <div className="border-b border-crema-200 dark:border-oscuro-border bg-crema-50/80 dark:bg-oscuro-surface/80 backdrop-blur-sm px-4 pt-3 pb-2">
          <p className="text-[10px] uppercase tracking-wider text-cafe-light dark:text-crema-400 mb-2 font-semibold">
            Tus respuestas
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {turns.map((turn, i) => (
              <button
                key={i}
                onClick={() => onRedo(i)}
                title="Tocá para cambiar esta respuesta"
                className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-oscuro-card border border-crema-200 dark:border-oscuro-border rounded-full px-3 py-1.5 text-xs text-cafe-dark dark:text-crema-200 hover:border-dorado/60 hover:bg-dorado/5 transition-all active:scale-95 max-w-[180px] group"
              >
                <span className="text-dorado/60 group-hover:text-dorado transition-colors text-[10px]">✎</span>
                <span className="truncate">{turn.answer}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main scrollable area */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">

        {/* Loading */}
        {loading && (
          <div className="animate-fade-in flex gap-3 items-start">
            <span className="text-2xl flex-shrink-0">{icon}</span>
            <div className="bg-white dark:bg-oscuro-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-crema-100 dark:border-oscuro-border">
              <div className="flex gap-1.5 items-center h-5">
                <span className="w-2 h-2 bg-dorado rounded-full animate-bounce [animation-delay:0ms]" />
                <span className="w-2 h-2 bg-dorado rounded-full animate-bounce [animation-delay:150ms]" />
                <span className="w-2 h-2 bg-dorado rounded-full animate-bounce [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}

        {/* Current AI question + options */}
        {currentQuestion && !loading && (
          <div className="animate-fade-in space-y-3">

            {/* AI bubble */}
            <div className="flex gap-3 items-start">
              <span className="text-2xl flex-shrink-0 mt-0.5">{icon}</span>
              <div className="bg-white dark:bg-oscuro-card rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm border border-crema-100 dark:border-oscuro-border flex-1">
                <p className="text-sm leading-relaxed text-cafe-dark dark:text-crema-200">
                  <RichText text={currentQuestion} />
                </p>
              </div>
            </div>

            {/* Options */}
            <div className="pl-11 space-y-2">
              {currentOpciones.map((option, i) => {
                const isFree = isFreeTextTrigger(option)
                return (
                  <div key={i}>
                    <button
                      onClick={() => handleOptionClick(option)}
                      className={[
                        'w-full text-left px-4 py-3 rounded-xl border text-sm transition-all duration-150 active:scale-[0.98]',
                        isFree
                          ? 'border-dashed border-crema-300 dark:border-oscuro-border text-cafe-light dark:text-crema-400 hover:border-dorado/60 hover:text-dorado dark:hover:text-dorado flex items-center gap-2'
                          : 'bg-white dark:bg-oscuro-card border-crema-200 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado hover:shadow-md hover:bg-crema-50 dark:hover:bg-oscuro-surface',
                      ].join(' ')}
                    >
                      {isFree ? (
                        <>
                          <span className="text-base leading-none">✏️</span>
                          <span>{option}</span>
                        </>
                      ) : (
                        <div className="flex items-start gap-2.5">
                          <span className="text-dorado font-bold flex-shrink-0 tabular-nums">{i + 1}.</span>
                          <span>{option}</span>
                        </div>
                      )}
                    </button>

                    {/* Inline free text (expands below its trigger button) */}
                    {isFree && showFreeText && (
                      <div className="mt-2 animate-slide-up">
                        <textarea
                          ref={textareaRef}
                          value={freeText}
                          onChange={(e) => setFreeText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault()
                              handleFreeTextSubmit()
                            }
                          }}
                          placeholder={placeholder}
                          rows={3}
                          className="input-field w-full text-sm resize-none"
                        />
                        <div className="flex justify-end gap-2 mt-2">
                          <button
                            onClick={() => { setShowFreeText(false); setFreeText('') }}
                            className="text-xs text-cafe-light dark:text-crema-400 px-3 py-1.5 hover:text-cafe-dark dark:hover:text-crema-200 transition-colors"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={handleFreeTextSubmit}
                            disabled={!freeText.trim()}
                            className="btn-primary text-xs py-1.5 px-4"
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Fallback: if no opciones returned, show free text directly */}
              {currentOpciones.length === 0 && !showFreeText && (
                <button
                  onClick={() => setShowFreeText(true)}
                  className="w-full text-left px-4 py-3 rounded-xl border border-dashed border-crema-300 dark:border-oscuro-border text-cafe-light dark:text-crema-400 text-sm hover:border-dorado/60 hover:text-dorado flex items-center gap-2 transition-all active:scale-[0.98]"
                >
                  <span>✏️</span>
                  <span>Escribir mi respuesta</span>
                </button>
              )}
              {currentOpciones.length === 0 && showFreeText && (
                <div className="animate-slide-up">
                  <textarea
                    ref={textareaRef}
                    value={freeText}
                    onChange={(e) => setFreeText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleFreeTextSubmit()
                      }
                    }}
                    placeholder={placeholder}
                    rows={3}
                    className="input-field w-full text-sm resize-none"
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleFreeTextSubmit}
                      disabled={!freeText.trim()}
                      className="btn-primary text-xs py-1.5 px-4"
                    >
                      Enviar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  )
}
