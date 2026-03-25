import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Novena, api } from '../services/api'
import novenasJson from '../data/novenas.json'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { BugReportLink } from '../components/BugReportButton'
import { useAppStore, NovenaProgreso } from '../store/useAppStore'
import TimePicker from '../components/TimePicker'
import CalendarPicker from '../components/CalendarPicker'
import { slugify } from '../lib/slugify'
import { getOrCreatePushSubscription, getCurrentPushSubscription, isPushSupported } from '../lib/webpush'

const novenas = novenasJson as Novena[]

function hoyISO(): string {
  return new Date().toISOString().split('T')[0]
}

function isoToDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function formatFechaLarga(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  })
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  const result = await Notification.requestPermission()
  return result === 'granted'
}

async function saveWebPushSubscription(
  novenaId: number,
  nombreNovena: string,
  hora: string,
  setPushSubscription: (sub: PushSubscriptionJSON | null) => void,
): Promise<boolean> {
  try {
    const sub = await getOrCreatePushSubscription()
    if (!sub) return false
    setPushSubscription(sub.toJSON())
    await api.subscribeNotification(sub.toJSON(), novenaId, nombreNovena, hora)
    return true
  } catch {
    return false
  }
}

async function removeWebPushSubscription(novenaId: number, endpoint: string | undefined): Promise<void> {
  if (!endpoint) return
  try {
    await api.unsubscribeNotification(endpoint, novenaId)
  } catch {
    // Silencioso: si falla la limpieza en servidor no es crítico
  }
}

export default function NovenaDetallePage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const {
    novenasProgreso,
    setNovenaProgreso,
    removeNovenaProgreso,
    updateNovenaIntencion,
    updateNovenaNotificacion,
    marcarDiaRezado,
    pushSubscription,
    setPushSubscription,
  } = useAppStore()

  const novena = novenas.find(n => slugify(n.nombre) === slug)
  const novenaId = novena?.id ?? -1
  const progreso = novenasProgreso.find(p => p.novenaId === novenaId) ?? null
  const iniciada = progreso !== null
  const diaRecomendado = iniciada ? Math.min((progreso.diaActual ?? 0) + 1, 9) : 1

  const [diaSeleccionado, setDiaSeleccionado] = useState(diaRecomendado)
  const [intencionEdit, setIntencionEdit] = useState(progreso?.intencion ?? '')
  const [editandoIntencion, setEditandoIntencion] = useState(false)
  const [showNotifConfig, setShowNotifConfig] = useState(false)
  const [horaNotif, setHoraNotif] = useState(progreso?.notificacion?.hora ?? '08:00')
  const [notifActiva, setNotifActiva] = useState(progreso?.notificacion?.activa ?? false)
  const [fechaInicioInput, setFechaInicioInput] = useState(hoyISO())
  const [showCalendar, setShowCalendar] = useState(false)
  const intencionRef = useRef<HTMLTextAreaElement>(null)

  // Sync state when novenaId changes
  useEffect(() => {
    const p = novenasProgreso.find(pr => pr.novenaId === novenaId) ?? null
    const rec = p ? Math.min((p.diaActual ?? 0) + 1, 9) : 1
    setDiaSeleccionado(rec)
    setIntencionEdit(p?.intencion ?? '')
    setNotifActiva(p?.notificacion?.activa ?? false)
    setHoraNotif(p?.notificacion?.hora ?? '08:00')
  }, [novenaId])

  useEffect(() => {
    if (editandoIntencion) intencionRef.current?.focus()
  }, [editandoIntencion])

  if (!novena) {
    navigate('/novenas')
    return null
  }

  const diaActual = novena.dias?.find(d => d.dia === diaSeleccionado)
  const yaRezado = progreso?.diasCompletados.includes(diaSeleccionado) ?? false
  const totalCompletados = progreso?.diasCompletados.length ?? 0
  const terminada = totalCompletados >= 9

  async function comenzarNovena() {
    const nueva: NovenaProgreso = {
      novenaId: novena!.id,
      nombreNovena: novena!.nombre,
      santo: novena!.santo,
      diaActual: 0,
      fechaInicio: fechaInicioInput,
      intencion: intencionEdit.trim(),
      diasCompletados: [],
      notificacion: notifActiva ? { activa: true, hora: horaNotif } : null,
    }
    setNovenaProgreso(nueva)
    if (notifActiva) {
      const granted = await requestNotificationPermission()
      if (granted) {
        await saveWebPushSubscription(nueva.novenaId, nueva.nombreNovena, horaNotif, setPushSubscription)
      }
    }
    setEditandoIntencion(false)
  }

  function guardarIntencion() {
    updateNovenaIntencion(novena!.id, intencionEdit.trim())
    setEditandoIntencion(false)
  }

  async function toggleNotificacion(activa: boolean) {
    if (activa) {
      if (!isPushSupported()) {
        alert('Tu navegador no soporta notificaciones push. Probá instalando la app desde el menú de ajustes.')
        return
      }
      const granted = await requestNotificationPermission()
      if (!granted) {
        alert('Para recibir recordatorios, habilitá los permisos de notificación en tu navegador.')
        return
      }
    }
    setNotifActiva(activa)
    if (iniciada) {
      const nueva = activa ? { activa: true, hora: horaNotif } : null
      updateNovenaNotificacion(novena!.id, nueva)
      if (activa) {
        await saveWebPushSubscription(novena!.id, novena!.nombre, horaNotif, setPushSubscription)
      } else {
        const endpoint = pushSubscription?.endpoint
        await removeWebPushSubscription(novena!.id, endpoint)
      }
    }
  }

  async function guardarHoraNotif(hora: string) {
    setHoraNotif(hora)
    if (iniciada) {
      updateNovenaNotificacion(novena!.id, { activa: notifActiva, hora })
      if (notifActiva) {
        // Upsert con la nueva hora
        await saveWebPushSubscription(novena!.id, novena!.nombre, hora, setPushSubscription)
      }
    }
  }

  function handleMarcarRezado() {
    marcarDiaRezado(novena!.id, diaSeleccionado)
    if (diaSeleccionado < 9) setDiaSeleccionado(diaSeleccionado + 1)
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="beads" size={18} />}
        title={novena.nombre}
        subtitle={novena.santo}
        onReset={() => navigate('/novenas')}
      />

      <div className="flex-1 overflow-y-auto pb-28">

        {/* ── Barra de progreso ── */}
        {iniciada && (
          <div className="px-4 pt-4 pb-3 border-b border-crema-200 dark:border-oscuro-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide">
                {terminada ? 'Novena completada' : `Día ${totalCompletados + 1} de 9`}
              </span>
              {terminada && (
                <span className="text-xs text-dorado font-semibold">Completada</span>
              )}
            </div>
            <div className="flex gap-1.5">
              {Array.from({ length: 9 }, (_, i) => {
                const dia = i + 1
                const completado = progreso!.diasCompletados.includes(dia)
                const esCurrent = dia === diaRecomendado && !completado
                return (
                  <div
                    key={dia}
                    className={`flex-1 h-2 rounded-full transition-all duration-300 ${
                      completado
                        ? 'bg-dorado'
                        : esCurrent
                          ? 'bg-dorado/40'
                          : 'bg-crema-200 dark:bg-oscuro-border'
                    }`}
                  />
                )
              })}
            </div>
          </div>
        )}

        {/* ── Intención personal ── */}
        <div className="px-4 py-4 border-b border-crema-200 dark:border-oscuro-border">
          {!iniciada ? (
            <div className="space-y-4">
              {novena.descripcion && (
                <p className="text-sm text-cafe-light dark:text-crema-300 leading-relaxed">
                  {novena.descripcion}
                </p>
              )}
              <div>
                <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide block mb-1.5">
                  Tu intención personal
                </label>
                <textarea
                  ref={intencionRef}
                  value={intencionEdit}
                  onChange={e => setIntencionEdit(e.target.value)}
                  placeholder="Escribí la intención por la que querés rezar esta novena…"
                  rows={3}
                  className="w-full rounded-xl border border-crema-300 dark:border-oscuro-border
                             bg-crema dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
                             text-sm px-3 py-2.5 resize-none outline-none
                             focus:border-dorado/60 transition-colors"
                />
              </div>
              <div className="flex items-center justify-between bg-crema-100 dark:bg-oscuro-surface rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-cafe-dark dark:text-crema-200">Recordatorio diario</p>
                  <p className="text-xs text-cafe-light dark:text-crema-300">Recibí una notificación cada día</p>
                </div>
                <button
                  onClick={() => toggleNotificacion(!notifActiva)}
                  className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifActiva ? 'bg-dorado' : 'bg-crema-300 dark:bg-oscuro-border'}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${notifActiva ? 'left-[22px]' : 'left-0.5'}`} />
                </button>
              </div>
              {notifActiva && (
                <div className="space-y-4 animate-fade-in">
                  <div>
                    <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide block mb-2">
                      Fecha de inicio
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowCalendar(v => !v)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl
                                 bg-crema dark:bg-oscuro-surface border border-crema-300 dark:border-oscuro-border
                                 text-cafe-dark dark:text-crema-200 text-sm font-medium
                                 active:scale-[0.98] transition-all"
                    >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="text-dorado flex-shrink-0">
                        <rect x="1" y="3" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M1 7h13" stroke="currentColor" strokeWidth="1.3"/>
                        <path d="M5 1v4M10 1v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
                      </svg>
                      {formatFechaLarga(fechaInicioInput)}
                    </button>
                    {showCalendar && (
                      <div className="mt-2 animate-fade-in">
                        <CalendarPicker
                          inline
                          selectedDate={isoToDate(fechaInicioInput)}
                          today={new Date()}
                          onSelect={date => {
                            setFechaInicioInput(
                              `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
                            )
                            setShowCalendar(false)
                          }}
                          onClose={() => setShowCalendar(false)}
                        />
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide block mb-2">
                      Hora del recordatorio
                    </label>
                    <TimePicker value={horaNotif} onChange={guardarHoraNotif} />
                  </div>
                  <p className="text-xs text-cafe-light dark:text-crema-400 leading-relaxed bg-crema-100 dark:bg-oscuro-surface rounded-xl px-4 py-3">
                    Comenzarás a recibir notificaciones a partir del{' '}
                    <span className="font-semibold text-cafe-dark dark:text-crema-200">
                      {formatFechaLarga(fechaInicioInput)}
                    </span>{' '}
                    a las{' '}
                    <span className="font-semibold text-cafe-dark dark:text-crema-200">
                      {horaNotif}
                    </span>.
                  </p>
                </div>
              )}
              <button
                onClick={comenzarNovena}
                className="w-full bg-dorado text-crema-50 rounded-2xl py-3.5 font-semibold
                           text-sm shadow-md active:scale-[0.98] transition-all duration-150"
              >
                Comenzar novena
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-dorado uppercase tracking-wide mb-1">Tu intención</p>
                <button
                  onClick={() => setEditandoIntencion(v => !v)}
                  className="text-xs text-cafe-light dark:text-crema-400 underline"
                >
                  {editandoIntencion ? 'Cancelar' : 'Editar'}
                </button>
              </div>
              {editandoIntencion ? (
                <div className="space-y-2">
                  <textarea
                    ref={intencionRef}
                    value={intencionEdit}
                    onChange={e => setIntencionEdit(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-crema-300 dark:border-oscuro-border
                               bg-crema dark:bg-oscuro-surface text-cafe-dark dark:text-crema-200
                               text-sm px-3 py-2.5 resize-none outline-none focus:border-dorado/60 transition-colors"
                  />
                  <button
                    onClick={guardarIntencion}
                    className="px-4 py-1.5 bg-dorado text-crema-50 rounded-lg text-xs font-semibold"
                  >
                    Guardar
                  </button>
                </div>
              ) : (
                <p className="text-sm text-cafe-dark dark:text-crema-200 italic leading-relaxed">
                  {progreso!.intencion
                    ? `"${progreso!.intencion}"`
                    : <span className="text-cafe-light dark:text-crema-400 not-italic">Sin intención escrita</span>
                  }
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── Selector de días ── */}
        {iniciada && novena.dias && novena.dias.length > 0 && (
          <div className="px-4 py-3 border-b border-crema-200 dark:border-oscuro-border">
            <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-2 uppercase tracking-wide">
              Días
            </p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {novena.dias.map((dia) => {
                const completado = progreso!.diasCompletados.includes(dia.dia)
                const esCurrent = dia.dia === diaRecomendado && !completado
                return (
                  <button
                    key={dia.dia}
                    onClick={() => setDiaSeleccionado(dia.dia)}
                    className={`relative flex-shrink-0 w-9 h-9 rounded-full text-sm font-medium transition-all duration-150
                      ${diaSeleccionado === dia.dia
                        ? 'bg-dorado text-crema-50 shadow-md'
                        : completado
                          ? 'bg-dorado/20 text-dorado-dark dark:text-dorado border border-dorado/30'
                          : esCurrent
                            ? 'bg-crema-200 dark:bg-oscuro-border text-cafe-dark dark:text-crema-200 ring-2 ring-dorado/50'
                            : 'bg-crema-200 dark:bg-oscuro-border text-cafe-light dark:text-crema-400'
                      }`}
                  >
                    {dia.dia}
                    {completado && diaSeleccionado !== dia.dia && (
                      <span className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-dorado rounded-full flex items-center justify-center">
                        <svg viewBox="0 0 10 10" className="w-2 h-2 text-white" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                          <path d="M1.5 5l2.5 2.5 4.5-4.5" />
                        </svg>
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Oración del día ── */}
        {iniciada && diaActual && (
          <div className="px-4 py-5 animate-fade-in">
            {diaActual.titulo && (
              <h2 className="font-serif text-xl text-cafe-dark dark:text-crema-200 mb-4 font-semibold">
                {diaActual.titulo}
              </h2>
            )}
            {diaActual.reflexion && (
              <div className="mb-4 card bg-crema-100 dark:bg-oscuro-surface">
                <p className="text-xs font-semibold text-dorado mb-2 uppercase tracking-wide">Reflexión</p>
                <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed italic">
                  {diaActual.reflexion}
                </p>
              </div>
            )}
            <div className="card mb-4">
              <p className="text-sm leading-relaxed text-cafe-dark dark:text-crema-200 whitespace-pre-wrap">
                {diaActual.oracion}
              </p>
            </div>

            {!terminada && (
              <button
                onClick={handleMarcarRezado}
                disabled={yaRezado}
                className={`w-full rounded-2xl py-3.5 font-semibold text-sm transition-all duration-150
                  ${yaRezado
                    ? 'bg-dorado/20 text-dorado-dark dark:text-dorado border border-dorado/30 cursor-default'
                    : 'bg-dorado text-crema-50 shadow-md active:scale-[0.98]'
                  }`}
              >
                {yaRezado ? 'Ya rezaste este día' : 'Marcar como rezado'}
              </button>
            )}
            {terminada && (
              <div className="text-center py-4">
                <p className="text-dorado font-serif text-lg font-semibold">Novena completada</p>
                <p className="text-sm text-cafe-light dark:text-crema-300 mt-1">
                  Has completado los 9 días de oración.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ── Configuración de notificaciones (si ya inició) ── */}
        {iniciada && (
          <div className="px-4 pb-4">
            <button
              onClick={() => setShowNotifConfig(v => !v)}
              className="w-full flex items-center justify-between py-3 text-sm text-cafe-light dark:text-crema-300"
            >
              <span className="flex items-center gap-2">
                <Icon name="bell" size={16} />
                Configurar recordatorio
              </span>
              <Icon name="chevron-right" size={16} className={`transition-transform ${showNotifConfig ? 'rotate-90' : ''}`} />
            </button>

            {showNotifConfig && (
              <div className="space-y-3 pt-1 pb-2">
                <div className="flex items-center justify-between bg-crema-100 dark:bg-oscuro-surface rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-cafe-dark dark:text-crema-200">Recordatorio diario</p>
                    <p className="text-xs text-cafe-light dark:text-crema-300">Notificación cada día a la misma hora</p>
                  </div>
                  <button
                    onClick={() => toggleNotificacion(!notifActiva)}
                    className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${notifActiva ? 'bg-dorado' : 'bg-crema-300 dark:bg-oscuro-border'}`}
                  >
                    <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${notifActiva ? 'left-[22px]' : 'left-0.5'}`} />
                  </button>
                </div>
                {notifActiva && (
                  <div className="flex flex-col gap-2 px-1">
                    <label className="text-xs text-cafe-light dark:text-crema-300">Hora del recordatorio</label>
                    <TimePicker value={horaNotif} onChange={guardarHoraNotif} />
                  </div>
                )}
                <button
                  onClick={() => { removeNovenaProgreso(novena!.id); navigate('/novenas') }}
                  className="w-full text-xs text-red-400 py-2 text-center"
                >
                  Abandonar esta novena
                </button>
              </div>
            )}
          </div>
        )}

        <BugReportLink />
      </div>
    </div>
  )
}
