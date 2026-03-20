import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api, Novena } from '../services/api'
import { usePushNotifications } from '../hooks/usePushNotifications'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'

export default function NovenaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [novena, setNovena] = useState<Novena | null>(null)
  const [loading, setLoading] = useState(true)
  const [diaSeleccionado, setDiaSeleccionado] = useState(1)
  const [hora, setHora] = useState('08:00')
  const [iniciando, setIniciando] = useState(false)
  const [activaId, setActivaId] = useState<number | null>(null)
  const [showHora, setShowHora] = useState(false)
  const { subscribe, requesting, error: pushError, isSupported } = usePushNotifications()

  useEffect(() => {
    if (!id) return
    api.getNovena(Number(id))
      .then(setNovena)
      .catch(() => navigate('/novenas'))
      .finally(() => setLoading(false))
  }, [id, navigate])

  const handleIniciar = async () => {
    if (!novena) return
    setShowHora(true)
  }

  const handleConfirmarNovena = async () => {
    if (!novena) return
    setIniciando(true)
    try {
      const sub = await subscribe()
      if (!sub?.endpoint) {
        setIniciando(false)
        return
      }
      const result = await api.iniciarNovena(sub.endpoint, novena.id, hora)
      setActivaId(result.id)
      setShowHora(false)
    } catch (e) {
      console.error(e)
    } finally {
      setIniciando(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen animate-pulse-soft">
        <span className="text-4xl">📿</span>
      </div>
    )
  }

  if (!novena) return null

  const diaActual = novena.dias?.find(d => d.dia === diaSeleccionado)

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="beads" size={18} />}
        title={novena.nombre}
        subtitle={novena.santo}
        onReset={() => navigate('/novenas')}
      />

      <div className="flex-1 overflow-y-auto pb-28">
        {/* Info de la novena */}
        <div className="px-4 py-4 border-b border-crema-200 dark:border-oscuro-border bg-crema-100 dark:bg-oscuro-surface">
          {novena.descripcion && (
            <p className="text-sm text-cafe-light dark:text-crema-300 leading-relaxed mb-3">
              {novena.descripcion}
            </p>
          )}
          {novena.intencionSugerida && (
            <div className="bg-dorado/10 rounded-xl px-4 py-3">
              <p className="text-xs font-semibold text-dorado-dark mb-1">Intención sugerida</p>
              <p className="text-sm text-cafe-dark dark:text-crema-200 italic">
                "{novena.intencionSugerida}"
              </p>
            </div>
          )}
        </div>

        {/* Selector de días */}
        {novena.dias && novena.dias.length > 0 && (
          <div className="px-4 py-3 border-b border-crema-200 dark:border-oscuro-border">
            <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-2 uppercase tracking-wide">
              Seleccioná el día
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {novena.dias.map((dia) => (
                <button
                  key={dia.dia}
                  onClick={() => setDiaSeleccionado(dia.dia)}
                  className={`flex-shrink-0 w-9 h-9 rounded-full text-sm font-medium transition-all duration-150
                    ${diaSeleccionado === dia.dia
                      ? 'bg-dorado text-crema-50 shadow-md'
                      : 'bg-crema-200 dark:bg-oscuro-border text-cafe-dark dark:text-crema-300 hover:bg-crema-300'
                    }`}
                >
                  {dia.dia}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Oración del día */}
        {diaActual && (
          <div className="px-4 py-5 animate-fade-in">
            {diaActual.titulo && (
              <h2 className="font-serif text-xl text-cafe-dark dark:text-crema-200 mb-4 font-semibold">
                {diaActual.titulo}
              </h2>
            )}
            <div className="card">
              <p className="text-sm leading-relaxed text-cafe-dark dark:text-crema-200 whitespace-pre-wrap">
                {diaActual.oracion}
              </p>
            </div>
            {diaActual.reflexion && (
              <div className="mt-4 card bg-crema-100 dark:bg-oscuro-surface">
                <p className="text-xs font-semibold text-dorado mb-2 uppercase tracking-wide">
                  Reflexión
                </p>
                <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed italic">
                  {diaActual.reflexion}
                </p>
              </div>
            )}
          </div>
        )}

        {novena.dias?.length === 0 && (
          <div className="px-4 py-8 text-center text-cafe-light dark:text-crema-300 text-sm">
            Esta novena aún no tiene las oraciones cargadas.
          </div>
        )}
      </div>

      {/* CTA — Iniciar novena con notificaciones */}
      <div className="border-t border-crema-200 dark:border-oscuro-border p-4 bg-white/90 dark:bg-oscuro-surface/90 backdrop-blur-sm">
        {activaId ? (
          <div className="text-center animate-fade-in">
            <p className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1">
              ✅ Novena iniciada
            </p>
            <p className="text-xs text-cafe-light dark:text-crema-300">
              Vas a recibir tu recordatorio a las {hora} cada día.
            </p>
          </div>
        ) : showHora ? (
          <div className="animate-slide-up space-y-3">
            <p className="text-sm font-medium text-cafe-dark dark:text-crema-200">
              ¿A qué hora querés el recordatorio diario?
            </p>
            <input
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
              className="input-field"
            />
            {pushError && (
              <p className="text-xs text-red-500">{pushError}</p>
            )}
            <button
              onClick={handleConfirmarNovena}
              disabled={iniciando || requesting}
              className="btn-primary w-full"
            >
              {iniciando || requesting ? 'Activando...' : 'Activar recordatorios'}
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <button onClick={handleIniciar} className="btn-primary w-full">
              📿 Iniciar novena con recordatorios
            </button>
            {!isSupported && (
              <p className="text-xs text-center text-cafe-light dark:text-crema-300">
                Tu navegador no soporta notificaciones push
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
