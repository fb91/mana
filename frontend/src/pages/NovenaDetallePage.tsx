import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Novena, NovenaDia, api } from '../services/api'
import { supabase } from '../lib/supabase'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { BugReportLink } from '../components/BugReportButton'
import { useAppStore, NovenaProgreso } from '../store/useAppStore'
import { useAdminStore } from '../store/useAdminStore'
import TimePicker from '../components/TimePicker'
import CalendarPicker from '../components/CalendarPicker'
import { slugify } from '../lib/slugify'
import { getOrCreatePushSubscription, getCurrentPushSubscription, isPushSupported } from '../lib/webpush'

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

// Buenos Aires es UTC-3 fijo (sin DST)
const BSAS_OFFSET_MINUTES = -180

/**
 * Convierte una hora "HH:MM" en hora local del usuario a su equivalente en Buenos Aires.
 * El servidor siempre opera en UTC-3, así que guardamos en ese timezone.
 */
function localToBsas(hora: string): string {
  const [h, m] = hora.split(':').map(Number)
  const userOffset = -new Date().getTimezoneOffset() // minutos, e.g. +60 para UTC+1
  const diff = BSAS_OFFSET_MINUTES - userOffset
  const totalLocal = h * 60 + m
  const totalBsas = ((totalLocal + diff) % (24 * 60) + 24 * 60) % (24 * 60)
  return `${String(Math.floor(totalBsas / 60)).padStart(2, '0')}:${String(totalBsas % 60).padStart(2, '0')}`
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
    await api.subscribeNotification(sub.toJSON(), novenaId, nombreNovena, localToBsas(hora))
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
  const { isContributor } = useAdminStore()

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

  const [novena, setNovena] = useState<Novena | null>(null)
  const [loadingNovena, setLoadingNovena] = useState(true)

  useEffect(() => {
    let cancelled = false

    // 1) Buscar la novena por slug (query liviana)
    supabase
      .from('novenas')
      .select('id, nombre, santo, descripcion, intencion_sugerida, categoria, fecha_festividad')
      .eq('published', true)
      .order('nombre')
      .then(async ({ data: rows }) => {
        if (cancelled) return
        const match = (rows ?? []).find(r => slugify(r.nombre) === slug)
        if (!match) { setLoadingNovena(false); return }

        // 2) Traer solo los días de esta novena (query dirigida, no toda la tabla)
        const { data: diasData } = await supabase
          .from('novena_dias')
          .select('id, novena_id, dia, titulo, oracion, reflexion')
          .eq('novena_id', match.id)
          .order('dia')

        if (cancelled) return

        const dias: NovenaDia[] = (diasData ?? []).map(d => ({
          id: d.id,
          novenaId: d.novena_id,
          dia: d.dia,
          titulo: d.titulo ?? undefined,
          oracion: d.oracion,
          reflexion: d.reflexion ?? undefined,
        }))

        setNovena({
          id: match.id,
          nombre: match.nombre,
          santo: match.santo,
          descripcion: match.descripcion ?? undefined,
          intencionSugerida: match.intencion_sugerida ?? undefined,
          estado: 'publicado',
          categoria: match.categoria ?? undefined,
          fechaFestividad: match.fecha_festividad ?? undefined,
          dias,
        })
        setLoadingNovena(false)
      })
    return () => { cancelled = true }
  }, [slug])

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
  const [showSuccess, setShowSuccess] = useState(false)
  const [showCelebracion, setShowCelebracion] = useState(false)
  const intencionRef = useRef<HTMLTextAreaElement>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

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

  if (loadingNovena) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-dorado border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

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
    const completadosDespues = [...(progreso?.diasCompletados ?? []), diaSeleccionado]
    const esUltimoDia = completadosDespues.length >= 9

    marcarDiaRezado(novena!.id, diaSeleccionado)

    if (esUltimoDia) {
      if (progreso?.notificacion?.activa) {
        const endpoint = pushSubscription?.endpoint
        removeWebPushSubscription(novena!.id, endpoint)
        updateNovenaNotificacion(novena!.id, null)
      }
      setTimeout(() => setShowCelebracion(true), 200)
    } else {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        if (diaSeleccionado < 9) setDiaSeleccionado(diaSeleccionado + 1)
        requestAnimationFrame(() => {
          scrollRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
        })
      }, 1300)
    }
  }

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="beads" size={18} />}
        title={novena.nombre}
        subtitle={novena.santo}
        onReset={() => navigate('/novenas')}
        actions={isContributor() ? (
          <button
            onClick={() => navigate(`/admin/novenas/${novena.id}`)}
            className="flex items-center gap-1.5 text-xs font-semibold text-dorado px-3 py-1.5 rounded-lg border border-dorado/40 active:scale-95 transition-all"
          >
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M8 2l3 3-7 7H1v-3l7-7z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
            </svg>
            Editar
          </button>
        ) : undefined}
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto pb-28">

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
                  onClick={async () => {
                    if (progreso?.notificacion?.activa) {
                      await removeWebPushSubscription(novena!.id, pushSubscription?.endpoint)
                    }
                    removeNovenaProgreso(novena!.id)
                    navigate('/novenas')
                  }}
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

      {/* ── Flash de éxito al marcar como rezado ── */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-bounce-in flex flex-col items-center gap-3 bg-dorado rounded-3xl px-10 py-7 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-white font-semibold text-base tracking-wide">¡Día rezado!</p>
          </div>
        </div>
      )}

      {/* ── Celebración al completar la novena (día 9) ── */}
      {showCelebracion && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #3D2000 0%, #1C0D00 60%, #261005 100%)' }}>

          {/* Partículas flotantes */}
          {PARTICULAS_CELEBRACION.map((p, i) => (
            <span
              key={i}
              className="absolute animate-float-particle pointer-events-none select-none"
              style={{
                left: `${p.x}%`,
                bottom: `${p.bottom}%`,
                fontSize: `${p.size}px`,
                '--delay': `${p.delay}s`,
                '--duration': `${p.duration}s`,
              } as Record<string, string>}
            >
              {p.symbol}
            </span>
          ))}

          {/* Contenido central */}
          <div className="relative flex flex-col items-center gap-5 text-center px-8 animate-pop-in">
            {/* Icono */}
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-2"
              style={{ background: 'radial-gradient(circle, rgba(245,200,66,0.3) 0%, rgba(245,200,66,0.05) 70%)' }}>
              <svg viewBox="0 0 48 48" className="w-16 h-16 animate-shimmer" fill="none">
                <circle cx="24" cy="24" r="22" stroke="rgb(245,200,66)" strokeWidth="1.5" strokeDasharray="4 3" />
                <text x="24" y="32" textAnchor="middle" fontSize="26" fill="rgb(245,200,66)">✝</text>
              </svg>
            </div>

            <h2 className="font-serif text-3xl font-bold text-amber-100 leading-tight">
              ¡Novena completada!
            </h2>
            <p className="text-amber-300 text-base leading-relaxed max-w-xs">
              Has completado los 9 días de oración.{progreso?.intencion ? ' Que Dios escuche tu intención.' : ' Que Dios te bendiga.'}
            </p>

            {progreso?.intencion && (
              <p className="text-amber-200/70 text-sm italic max-w-xs leading-relaxed">
                "{progreso.intencion}"
              </p>
            )}

            <button
              onClick={() => setShowCelebracion(false)}
              className="mt-3 bg-amber-400 text-amber-950 rounded-2xl px-10 py-3.5 font-bold text-base shadow-lg active:scale-95 transition-transform"
            >
              Amén
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const PARTICULAS_CELEBRACION = [
  { x: 8,  bottom: 5,  size: 18, symbol: '✦', delay: 0,    duration: 2.4 },
  { x: 18, bottom: 8,  size: 12, symbol: '✶', delay: 0.3,  duration: 2.0 },
  { x: 30, bottom: 3,  size: 22, symbol: '✦', delay: 0.6,  duration: 2.7 },
  { x: 45, bottom: 6,  size: 14, symbol: '✸', delay: 0.2,  duration: 2.2 },
  { x: 58, bottom: 4,  size: 20, symbol: '✦', delay: 0.8,  duration: 2.5 },
  { x: 70, bottom: 9,  size: 10, symbol: '✶', delay: 0.4,  duration: 1.9 },
  { x: 82, bottom: 5,  size: 16, symbol: '✸', delay: 1.0,  duration: 2.3 },
  { x: 92, bottom: 7,  size: 13, symbol: '✦', delay: 0.1,  duration: 2.1 },
  { x: 12, bottom: 15, size: 10, symbol: '✶', delay: 1.2,  duration: 2.6 },
  { x: 25, bottom: 12, size: 16, symbol: '✦', delay: 0.7,  duration: 2.0 },
  { x: 38, bottom: 18, size: 11, symbol: '✸', delay: 0.5,  duration: 2.4 },
  { x: 52, bottom: 10, size: 19, symbol: '✦', delay: 1.4,  duration: 2.2 },
  { x: 65, bottom: 14, size: 12, symbol: '✶', delay: 0.9,  duration: 2.8 },
  { x: 78, bottom: 11, size: 15, symbol: '✦', delay: 1.1,  duration: 2.1 },
  { x: 88, bottom: 16, size: 9,  symbol: '✸', delay: 0.3,  duration: 2.5 },
  { x: 5,  bottom: 20, size: 14, symbol: '✦', delay: 1.6,  duration: 2.3 },
  { x: 35, bottom: 2,  size: 17, symbol: '✶', delay: 1.8,  duration: 2.0 },
  { x: 62, bottom: 20, size: 11, symbol: '✦', delay: 1.3,  duration: 2.6 },
  { x: 75, bottom: 2,  size: 20, symbol: '✸', delay: 2.0,  duration: 2.2 },
  { x: 95, bottom: 18, size: 13, symbol: '✦', delay: 0.6,  duration: 2.4 },
]
