import { useState, useCallback, useRef, useEffect } from 'react'
import PageHeader from '../components/PageHeader'
import ConversationalInterface, { ConvTurn } from '../components/ConversationalInterface'
import RichText from '../components/RichText'
import { api, ChatMessage } from '../services/api'

type Phase = 'initial' | 'conversation'

const PREGUNTAS_SUGERIDAS = [
  '¿Qué dice la Iglesia sobre el perdón?',
  '¿Cuál es el significado del purgatorio?',
  '¿Cómo orar cuando no siento nada?',
  '¿Por qué la Eucaristía es tan importante?',
  '¿Qué son las indulgencias?',
  '¿Cómo discernir la voluntad de Dios?',
]

export default function QAPage() {
  const [phase, setPhase] = useState<Phase>('initial')
  const [inputValue, setInputValue] = useState('')
  const [turns, setTurns] = useState<ConvTurn[]>([])
  const [currentQuestion, setCurrentQuestion] = useState('') // AI answer shown as "question"
  const [currentOpciones, setCurrentOpciones] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (phase === 'initial') textareaRef.current?.focus()
  }, [phase])

  // Build ChatMessage[] from turns (for QA, answer=user question, question=AI answer)
  // Order: user asked → AI answered → user asked again...
  const buildMessages = (initialQ: string, t: ConvTurn[]): ChatMessage[] => {
    const msgs: ChatMessage[] = [{ role: 'user', content: initialQ }]
    for (const turn of t) {
      msgs.push({ role: 'assistant', content: turn.question })
      msgs.push({ role: 'user', content: turn.answer })
    }
    return msgs
  }

  // We keep the initial question separately to rebuild history
  const [initialQuestion, setInitialQuestion] = useState('')

  const askQuestion = useCallback(async (question: string) => {
    if (!question.trim()) return
    setInitialQuestion(question)
    setPhase('conversation')
    setLoading(true)
    try {
      const { response, opciones } = await api.qa([{ role: 'user', content: question }])
      setCurrentQuestion(response)
      setCurrentOpciones(opciones)
    } catch {
      setCurrentQuestion('Hubo un error al conectar. Por favor intentá de nuevo.')
      setCurrentOpciones([])
    } finally {
      setLoading(false)
    }
  }, [])

  const handleAnswer = useCallback(async (answer: string) => {
    const newTurn: ConvTurn = { question: currentQuestion, opciones: currentOpciones, answer }
    const updatedTurns = [...turns, newTurn]
    setTurns(updatedTurns)
    setCurrentQuestion('')
    setCurrentOpciones([])
    setLoading(true)

    try {
      // If user chose "Tengo otra pregunta", treat their typed text as a fresh question
      const isFreshQuestion = answer === 'Tengo otra pregunta'
      if (isFreshQuestion) {
        // This will trigger showing a free-text box; the actual new question comes as `answer`
        // But since we already got a free text here, just send as new follow-up
      }
      const messages = buildMessages(initialQuestion, updatedTurns)
      const { response, opciones } = await api.qa(messages)
      setCurrentQuestion(response)
      setCurrentOpciones(opciones)
    } catch {
      setCurrentQuestion('Hubo un error. Por favor intentá de nuevo.')
      setCurrentOpciones([])
    } finally {
      setLoading(false)
    }
  }, [currentQuestion, currentOpciones, turns, initialQuestion])

  const handleRedo = useCallback((index: number) => {
    const turn = turns[index]
    setTurns(turns.slice(0, index))
    setCurrentQuestion(turn.question)
    setCurrentOpciones(turn.opciones)
  }, [turns])

  const handleReset = useCallback(() => {
    setPhase('initial')
    setTurns([])
    setCurrentQuestion('')
    setCurrentOpciones([])
    setInitialQuestion('')
    setInputValue('')
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon="❓"
        title="Preguntas y Respuestas"
        subtitle="Fe, moral y doctrina católica"
        onReset={phase !== 'initial' ? handleReset : undefined}
      />

      {phase === 'initial' && (
        <div className="flex-1 overflow-y-auto px-4 py-6 animate-fade-in">
          <div className="max-w-sm mx-auto space-y-5">
            <div className="text-center">
              <div className="text-5xl mb-3">📚</div>
              <h2 className="font-serif text-xl text-cafe-dark dark:text-crema-200 mb-1">
                ¿Qué querés saber?
              </h2>
              <p className="text-cafe-light dark:text-crema-300 text-sm">
                Preguntá sobre fe, moral, sacramentos o doctrina católica.
              </p>
            </div>

            {/* Free text input */}
            <div className="space-y-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    askQuestion(inputValue)
                  }
                }}
                placeholder="Escribí tu pregunta..."
                rows={3}
                className="input-field w-full text-sm resize-none"
              />
              <button
                onClick={() => askQuestion(inputValue)}
                disabled={!inputValue.trim()}
                className="btn-primary w-full"
              >
                Preguntar
              </button>
            </div>

            {/* Suggested questions */}
            <div>
              <p className="text-xs text-cafe-light dark:text-crema-400 mb-3 font-medium uppercase tracking-wider">
                Preguntas frecuentes
              </p>
              <div className="space-y-2">
                {PREGUNTAS_SUGERIDAS.map((p) => (
                  <button
                    key={p}
                    onClick={() => askQuestion(p)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-white dark:bg-oscuro-card border border-crema-200 dark:border-oscuro-border text-sm text-cafe-dark dark:text-crema-200 hover:border-dorado hover:shadow-sm hover:bg-crema-50 dark:hover:bg-oscuro-surface transition-all active:scale-[0.98] flex items-center gap-2.5"
                  >
                    <span className="text-dorado font-bold flex-shrink-0">›</span>
                    <RichText text={p} />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === 'conversation' && (
        <div className="flex-1 flex flex-col min-h-0">
          {loading && !currentQuestion && turns.length === 0 && (
            <div className="flex-1 flex items-center justify-center animate-pulse-soft">
              <div className="text-center">
                <span className="text-4xl">📚</span>
                <p className="text-cafe-light dark:text-crema-300 text-sm mt-3">
                  Buscando la respuesta...
                </p>
              </div>
            </div>
          )}
          {(currentQuestion || loading || turns.length > 0) && !(loading && !currentQuestion && turns.length === 0) && (
            <ConversationalInterface
              currentQuestion={currentQuestion}
              currentOpciones={currentOpciones}
              turns={turns}
              loading={loading}
              onAnswer={handleAnswer}
              onRedo={handleRedo}
              icon="📚"
              placeholder="Escribí tu pregunta..."
            />
          )}
        </div>
      )}
    </div>
  )
}
