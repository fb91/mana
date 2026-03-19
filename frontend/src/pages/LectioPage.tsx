import { useState, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import ChatInterface from '../components/ChatInterface'
import { api, ChatMessage } from '../services/api'
import { clearChatHistory } from '../lib/db'

type Phase = 'select' | 'chat'

const PASAJES_SUGERIDOS = [
  { ref: 'Juan 1:1-14',       titulo: 'El Verbo se hizo carne' },
  { ref: 'Salmo 23',          titulo: 'El Señor es mi pastor' },
  { ref: 'Mateo 5:1-12',      titulo: 'Las Bienaventuranzas' },
  { ref: 'Lucas 15:11-32',    titulo: 'El hijo pródigo' },
  { ref: 'Romanos 8:31-39',   titulo: 'Nada nos separará del amor de Dios' },
  { ref: 'Filipenses 4:4-7',  titulo: 'La paz de Dios' },
]

export default function LectioPage() {
  const [phase, setPhase] = useState<Phase>('select')
  const [pasaje, setPasaje] = useState('')
  const [customPasaje, setCustomPasaje] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [loading, setLoading] = useState(false)

  const handleStart = useCallback(async (p: string) => {
    const finalPasaje = p || customPasaje
    if (!finalPasaje.trim()) return
    setPasaje(finalPasaje)
    setPhase('chat')
    setLoading(true)

    try {
      const { response } = await api.lectio([], finalPasaje)
      setMessages([{ role: 'assistant', content: response }])
    } catch {
      setMessages([{
        role: 'assistant',
        content: 'Hubo un error al conectar. Por favor intentá de nuevo.'
      }])
    } finally {
      setLoading(false)
    }
  }, [customPasaje])

  const handleSend = useCallback(async (text: string) => {
    const userMsg: ChatMessage = { role: 'user', content: text }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setLoading(true)

    try {
      const { response } = await api.lectio(updated, pasaje)
      setMessages([...updated, { role: 'assistant', content: response }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Hubo un error. Por favor intentá de nuevo.'
      }])
    } finally {
      setLoading(false)
    }
  }, [messages, pasaje])

  const handleReset = useCallback(async () => {
    setPhase('select')
    setMessages([])
    setPasaje('')
    setCustomPasaje('')
    await clearChatHistory('lectio')
  }, [])

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="book-open" size={18} />}
        title="Lectio Divina"
        subtitle={pasaje || 'Lectura orante de la Escritura'}
        onReset={phase !== 'select' ? handleReset : undefined}
      />

      {phase === 'select' && (
        <div className="flex-1 overflow-y-auto px-4 py-5 animate-fade-in">
          <p className="text-sm text-cafe-light dark:text-crema-300 mb-5 text-center">
            Elegí un pasaje o ingresá el tuyo
          </p>

          <div className="space-y-2 mb-6">
            {PASAJES_SUGERIDOS.map(({ ref, titulo }) => (
              <button
                key={ref}
                onClick={() => handleStart(ref)}
                className="w-full card text-left hover:border-dorado/50 hover:shadow-sm
                           transition-all duration-150 active:scale-[0.98]"
              >
                <p className="font-medium text-cafe-dark dark:text-crema-200 text-sm">{titulo}</p>
                <p className="text-xs text-dorado mt-0.5">{ref}</p>
              </button>
            ))}
          </div>

          <div className="card">
            <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-2 uppercase tracking-wide">
              Otro pasaje
            </p>
            <input
              type="text"
              value={customPasaje}
              onChange={(e) => setCustomPasaje(e.target.value)}
              placeholder="Ej: Isaías 40:28-31"
              className="input-field mb-3 text-sm"
            />
            <button
              onClick={() => handleStart(customPasaje)}
              disabled={!customPasaje.trim()}
              className="btn-primary w-full"
            >
              Comenzar Lectio
            </button>
          </div>
        </div>
      )}

      {phase === 'chat' && (
        <div className="flex-1 flex flex-col min-h-0">
          {loading && messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center animate-pulse-soft">
              <div className="text-center">
                <span className="text-4xl">🕯️</span>
                <p className="text-cafe-light dark:text-crema-300 text-sm mt-3">
                  Preparando la Lectio...
                </p>
              </div>
            </div>
          ) : (
            <ChatInterface
              messages={messages}
              onSend={handleSend}
              loading={loading}
              placeholder="Compartí tu reflexión..."
            />
          )}
        </div>
      )}
    </div>
  )
}
