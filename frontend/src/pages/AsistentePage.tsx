import { useState, useEffect, type CSSProperties } from 'react'
import { useNavigate } from 'react-router-dom'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import TimePicker from '../components/TimePicker'
import { BugReportLink } from '../components/BugReportButton'
import { api, PlanEspiritualParams } from '../services/api'
import { useAppStore, PlanEspiritualProgreso } from '../store/useAppStore'
import { getLiturgicalContext, buildLiturgicalLabel } from '../lib/liturgicalCalendar'
import { parseBibleRef } from '../lib/bibleRefParser'
import { getBibleChapter } from '../lib/bible'
import {
  getOrCreatePushSubscription,
  isPushSupported,
} from '../lib/webpush'

// ── Helpers ──────────────────────────────────────────────────────────────────

function hoyISO(): string {
  return new Date().toISOString().split('T')[0]
}

const BSAS_OFFSET_MINUTES = -180
function localToBsas(hora: string): string {
  const [h, m] = hora.split(':').map(Number)
  const userOffset = -new Date().getTimezoneOffset()
  const diff = BSAS_OFFSET_MINUTES - userOffset
  const total = ((h * 60 + m + diff) % (24 * 60) + 24 * 60) % (24 * 60)
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`
}

async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  return (await Notification.requestPermission()) === 'granted'
}

async function subscribeAsitenteNotif(hora: string, setPushSubscription: (s: PushSubscriptionJSON | null) => void) {
  try {
    const sub = await getOrCreatePushSubscription()
    if (!sub) return
    setPushSubscription(sub.toJSON())
    // Reutilizamos el endpoint de novenas con id=-1 para asistente; el server solo guarda la suscripción
    await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        novenaId: -1,
        nombreNovena: 'Asistente Espiritual',
        hora: localToBsas(hora),
      }),
    })
  } catch { /* silencioso */ }
}

// ── Opciones de configuración ─────────────────────────────────────────────────

const DURACIONES = [3, 5, 7, 10, 14, 15]

const EDADES = ['Niño/a', 'Adolescente', 'Joven', 'Adulto/a', 'Adulto/a mayor']

const ESTADOS = [
  'Soltero/a',
  'Casado/a',
  'Casado/a con hijos',
  'Viudo/a',
  'Divorciado/a',
  'Laico/a consagrado/a',
  'Religioso/a',
]

const OBJETIVOS = [
  'Conocer la fe católica',
  'Crecer en la oración diaria',
  'Aprender a confiar en Dios',
  'Volver a Dios (conversión)',
  'Prepararme para la confesión',
  'Vivir mejor la caridad',
  'Fortalecer la vida familiar',
  'Crecer en disciplina espiritual',
  'Profundizar en la fe',
]

const FRECUENCIAS_ORACION = ['Nula', 'Baja', 'Media', 'Alta']

const ASISTENCIAS_MISA = [
  'Nunca',
  'En ocasiones especiales',
  'Los domingos',
  'Domingos y algún día más',
  'Diariamente',
]

// ── Tipos locales ─────────────────────────────────────────────────────────────

type Phase = 'config' | 'loading' | 'plan' | 'celebracion'

// ── Componente principal ──────────────────────────────────────────────────────

export default function AsistentePage() {
  const navigate = useNavigate()
  const {
    planEspiritual,
    setPlanEspiritual,
    removePlanEspiritual,
    marcarTareaEspiritual,
    desmarcarTareaEspiritual,
    marcarDiaPlanCompletado,
    updatePlanNotificacion,
    pushSubscription,
    setPushSubscription,
  } = useAppStore()

  const liturgicalCtx = getLiturgicalContext(new Date())
  const liturgicalLabel = buildLiturgicalLabel(liturgicalCtx)

  // Si ya hay un plan activo en curso, ir directo al plan
  const [phase, setPhase] = useState<Phase>(planEspiritual ? 'plan' : 'config')

  // ── Config ──
  const [duracion, setDuracion] = useState(7)
  const [edad, setEdad] = useState('')
  const [estado, setEstado] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [frecuenciaOracion, setFrecuenciaOracion] = useState('')
  const [asistenciaMisa, setAsistenciaMisa] = useState('')
  const [notifActiva, setNotifActiva] = useState(false)
  const [horaNotif, setHoraNotif] = useState('08:00')

  // ── Plan view ──
  const [diaSeleccionado, setDiaSeleccionado] = useState(1)
  const [showNotifConfig, setShowNotifConfig] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [error, setError] = useState('')

  const configCompleta = !!edad && !!estado && !!objetivo && !!frecuenciaOracion && !!asistenciaMisa

  // Sync día seleccionado con el plan activo
  useEffect(() => {
    if (planEspiritual) {
      const siguiente = Math.min(planEspiritual.diaActual + 1, planEspiritual.plan.duracionDias)
      setDiaSeleccionado(siguiente)
      setNotifActiva(planEspiritual.notificacion?.activa ?? false)
      setHoraNotif(planEspiritual.notificacion?.hora ?? '08:00')
    }
  }, [planEspiritual])

  // ── Generar plan ──────────────────────────────────────────────────────────
  async function generarPlan() {
    setPhase('loading')
    setError('')
    try {
      const params: PlanEspiritualParams = {
        duracion,
        edad,
        estado,
        objetivo,
        contextoLiturgico: liturgicalLabel,
        frecuenciaOracion,
        asistenciaMisa,
      }
      const plan = await api.generarPlanEspiritual(params)
      const cacheKey = [duracion, edad, estado, objetivo, liturgicalLabel, frecuenciaOracion, asistenciaMisa].join('|')

      const progreso: PlanEspiritualProgreso = {
        cacheKey,
        plan,
        params,
        fechaInicio: hoyISO(),
        diaActual: 0,
        diasCompletados: [],
        tareasCompletadas: [],
        notificacion: notifActiva ? { activa: true, hora: horaNotif } : null,
      }
      setPlanEspiritual(progreso)

      if (notifActiva) {
        const granted = await requestNotificationPermission()
        if (granted) await subscribeAsitenteNotif(horaNotif, setPushSubscription)
      }

      setPhase('plan')
    } catch {
      setError('No se pudo generar el plan. Por favor intentá de nuevo.')
      setPhase('config')
    }
  }

  // ── Tareas del día ────────────────────────────────────────────────────────
  function tareaKey(dia: number, tipo: string) {
    return `${dia}-${tipo}`
  }

  function isTareaCompletada(dia: number, tipo: string): boolean {
    return planEspiritual?.tareasCompletadas.includes(tareaKey(dia, tipo)) ?? false
  }

  function toggleTarea(dia: number, tipo: string) {
    const key = tareaKey(dia, tipo)
    if (isTareaCompletada(dia, tipo)) {
      desmarcarTareaEspiritual(key)
    } else {
      marcarTareaEspiritual(key)
    }
  }

  // Marcar el día como completado cuando todas las tareas están hechas
  function isDiaCompletado(dia: number): boolean {
    return planEspiritual?.diasCompletados.includes(dia) ?? false
  }

  function todasTareasDia(dia: number): boolean {
    return ['lectura', 'reflexion', 'oracion', 'accion'].every(t => isTareaCompletada(dia, t))
  }

  function handleMarcarDia() {
    if (!planEspiritual) return
    const total = planEspiritual.plan.duracionDias
    marcarDiaPlanCompletado(diaSeleccionado)

    const completadosDespues = [...planEspiritual.diasCompletados, diaSeleccionado]
    if (completadosDespues.length >= total) {
      setTimeout(() => setPhase('celebracion'), 300)
    } else {
      setShowSuccess(true)
      setTimeout(() => {
        setShowSuccess(false)
        if (diaSeleccionado < total) setDiaSeleccionado(diaSeleccionado + 1)
      }, 1300)
    }
  }

  async function toggleNotificacion(activa: boolean) {
    if (activa && !isPushSupported()) {
      alert('Tu navegador no soporta notificaciones push. Probá instalando la app.')
      return
    }
    if (activa) {
      const granted = await requestNotificationPermission()
      if (!granted) {
        alert('Para recibir recordatorios, habilitá los permisos de notificación.')
        return
      }
    }
    setNotifActiva(activa)
    if (planEspiritual) {
      updatePlanNotificacion(activa ? { activa: true, hora: horaNotif } : null)
      if (activa) await subscribeAsitenteNotif(horaNotif, setPushSubscription)
    }
  }

  function handleGuardarHora(hora: string) {
    setHoraNotif(hora)
    if (planEspiritual && notifActiva) {
      updatePlanNotificacion({ activa: true, hora })
      subscribeAsitenteNotif(hora, setPushSubscription)
    }
  }

  function handleReset() {
    if (phase === 'config') {
      navigate('/inicio')
    } else {
      setPhase('config')
    }
  }

  const plan = planEspiritual?.plan
  const diaData = plan?.plan.find(d => d.dia === diaSeleccionado)
  const diasCompletados = planEspiritual?.diasCompletados.length ?? 0
  const totalDias = plan?.duracionDias ?? duracion
  const diaRecomendado = planEspiritual ? Math.min(planEspiritual.diaActual + 1, totalDias) : 1
  const planTerminado = diasCompletados >= totalDias

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="sparkles" size={18} />}
        title="Asistente Espiritual"
        subtitle="Tu plan personalizado de oración"
        onReset={handleReset}
      />

      {/* ── FASE CONFIG ───────────────────────────────────────────────────── */}
      {phase === 'config' && (
        <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 animate-fade-in">
          {/* Intro */}
          <div className="mb-5 rounded-2xl bg-dorado/8 dark:bg-dorado/12 border border-dorado/20 px-4 py-3">
            <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">
              Respondé algunas preguntas y la IA generará un plan espiritual personalizado para vos,
              con una lectura, reflexión, oración y acción para cada día.
            </p>
          </div>

          {/* Tiempo litúrgico */}
          <div className="mb-4 flex items-center gap-2">
            <span className="inline-flex items-center text-xs bg-dorado/10 text-dorado
                             px-2.5 py-1 rounded-full border border-dorado/20 font-medium">
              {liturgicalLabel}
            </span>
            <span className="text-xs text-cafe-light dark:text-crema-400">Se tiene en cuenta al generar el plan</span>
          </div>

          {/* Duración */}
          <Section label="¿Cuántos días querés que dure el plan?">
            <div className="flex flex-wrap gap-2">
              {DURACIONES.map(d => (
                <button
                  key={d}
                  onClick={() => setDuracion(d)}
                  className={pill(duracion === d)}
                >
                  {d} días
                </button>
              ))}
            </div>
          </Section>

          {/* Edad */}
          <Section label="¿Cuál es tu grupo de edad?">
            <div className="flex flex-wrap gap-2">
              {EDADES.map(e => (
                <button key={e} onClick={() => setEdad(e)} className={pill(edad === e)}>{e}</button>
              ))}
            </div>
          </Section>

          {/* Estado de vida */}
          <Section label="¿Cuál es tu estado de vida?">
            <div className="flex flex-wrap gap-2">
              {ESTADOS.map(s => (
                <button key={s} onClick={() => setEstado(s)} className={pill(estado === s)}>{s}</button>
              ))}
            </div>
          </Section>

          {/* Objetivo */}
          <Section label="¿Qué objetivo querés trabajar?">
            <div className="flex flex-col gap-2">
              {OBJETIVOS.map(o => (
                <button
                  key={o}
                  onClick={() => setObjetivo(o)}
                  className={`px-4 py-2.5 rounded-xl text-sm text-left border transition-all duration-150 active:scale-[0.98]
                    ${objetivo === o
                      ? 'bg-dorado text-white border-dorado shadow-sm'
                      : 'bg-white dark:bg-oscuro-card border-crema-200 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50'
                    }`}
                >
                  {o}
                </button>
              ))}
            </div>
          </Section>

          {/* Hábitos */}
          <Section label="¿Con qué frecuencia rezás habitualmente?">
            <div className="flex flex-wrap gap-2">
              {FRECUENCIAS_ORACION.map(f => (
                <button key={f} onClick={() => setFrecuenciaOracion(f)} className={pill(frecuenciaOracion === f)}>{f}</button>
              ))}
            </div>
          </Section>

          <Section label="¿Con qué frecuencia asistís a Misa?">
            <div className="flex flex-col gap-2">
              {ASISTENCIAS_MISA.map(a => (
                <button
                  key={a}
                  onClick={() => setAsistenciaMisa(a)}
                  className={`px-4 py-2.5 rounded-xl text-sm text-left border transition-all duration-150 active:scale-[0.98]
                    ${asistenciaMisa === a
                      ? 'bg-dorado text-white border-dorado shadow-sm'
                      : 'bg-white dark:bg-oscuro-card border-crema-200 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50'
                    }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </Section>

          {/* Recordatorio */}
          <div className="flex items-center justify-between bg-crema-100 dark:bg-oscuro-surface rounded-xl px-4 py-3 mb-5">
            <div>
              <p className="text-sm font-medium text-cafe-dark dark:text-crema-200">Recordatorio diario</p>
              <p className="text-xs text-cafe-light dark:text-crema-300">Recibí una notificación cada día</p>
            </div>
            <Toggle active={notifActiva} onChange={setNotifActiva} />
          </div>
          {notifActiva && (
            <div className="mb-5 animate-fade-in">
              <label className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide block mb-2">
                Hora del recordatorio
              </label>
              <TimePicker value={horaNotif} onChange={setHoraNotif} />
            </div>
          )}

          {error && <p className="text-sm text-red-500 mb-3 text-center">{error}</p>}

          <button
            onClick={generarPlan}
            disabled={!configCompleta}
            className="btn-primary w-full mb-6"
          >
            Generar mi plan espiritual
          </button>

          {planEspiritual && (
            <button
              onClick={() => setPhase('plan')}
              className="w-full text-center text-sm text-dorado py-2 mb-4"
            >
              Volver a mi plan activo →
            </button>
          )}

          <BugReportLink />
        </div>
      )}

      {/* ── FASE LOADING ──────────────────────────────────────────────────── */}
      {phase === 'loading' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-5 px-6">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-2 border-dorado/20" />
            <div className="absolute inset-0 rounded-full border-2 border-dorado border-t-transparent animate-spin" />
            <span className="absolute inset-0 flex items-center justify-center text-2xl animate-pulse-soft">✨</span>
          </div>
          <p className="text-cafe-light dark:text-crema-300 text-sm text-center leading-relaxed">
            Preparando tu plan espiritual personalizado…
          </p>
        </div>
      )}

      {/* ── FASE PLAN ─────────────────────────────────────────────────────── */}
      {phase === 'plan' && plan && planEspiritual && (
        <div className="flex-1 overflow-y-auto pb-28">

          {/* Barra de progreso */}
          <div className="px-4 pt-4 pb-3 border-b border-crema-200 dark:border-oscuro-border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide">
                {planTerminado ? 'Plan completado' : `Día ${diasCompletados + 1} de ${totalDias}`}
              </span>
              <span className="text-xs text-dorado font-semibold">
                {diasCompletados}/{totalDias}
              </span>
            </div>
            <div className="flex gap-1">
              {Array.from({ length: totalDias }, (_, i) => {
                const dia = i + 1
                const completado = isDiaCompletado(dia)
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

          {/* Info del plan */}
          <div className="px-4 py-3 border-b border-crema-200 dark:border-oscuro-border">
            <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 text-base leading-snug mb-1">
              {plan.titulo}
            </p>
            <p className="text-xs text-cafe-light dark:text-crema-400 leading-relaxed">{plan.objetivo}</p>
          </div>

          {/* Selector de días */}
          <div className="px-4 py-3 border-b border-crema-200 dark:border-oscuro-border">
            <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 mb-2 uppercase tracking-wide">Días</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {plan.plan.map((d) => {
                const completado = isDiaCompletado(d.dia)
                const esCurrent = d.dia === diaRecomendado && !completado
                return (
                  <button
                    key={d.dia}
                    onClick={() => setDiaSeleccionado(d.dia)}
                    className={`relative flex-shrink-0 w-9 h-9 rounded-full text-sm font-medium transition-all duration-150
                      ${diaSeleccionado === d.dia
                        ? 'bg-dorado text-crema-50 shadow-md'
                        : completado
                          ? 'bg-dorado/20 text-dorado-dark dark:text-dorado border border-dorado/30'
                          : esCurrent
                            ? 'bg-crema-200 dark:bg-oscuro-border text-cafe-dark dark:text-crema-200 ring-2 ring-dorado/50'
                            : 'bg-crema-200 dark:bg-oscuro-border text-cafe-light dark:text-crema-400'
                      }`}
                  >
                    {d.dia}
                    {completado && diaSeleccionado !== d.dia && (
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

          {/* Contenido del día */}
          {diaData && (
            <div className="px-4 py-5 animate-fade-in">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-xs font-bold text-dorado uppercase tracking-wider">Día {diaData.dia}</span>
                <span className="w-1 h-1 rounded-full bg-dorado/40" />
                <h2 className="font-serif text-lg text-cafe-dark dark:text-crema-200 font-semibold leading-tight">
                  {diaData.tema}
                </h2>
              </div>

              {/* Tareas del día */}
              <div className="space-y-3 mb-5">
                <TareaCard
                  tipo="lectura"
                  label="Lectura bíblica"
                  emoji="📖"
                  contenido={diaData.lectura}
                  completada={isTareaCompletada(diaData.dia, 'lectura')}
                  onToggle={() => toggleTarea(diaData.dia, 'lectura')}
                />
                <TareaCard
                  tipo="reflexion"
                  label="Reflexión"
                  emoji="🕯️"
                  contenido={diaData.reflexion}
                  completada={isTareaCompletada(diaData.dia, 'reflexion')}
                  onToggle={() => toggleTarea(diaData.dia, 'reflexion')}
                />
                <TareaCard
                  tipo="oracion"
                  label="Oración"
                  emoji="🙏"
                  contenido={diaData.oracion}
                  completada={isTareaCompletada(diaData.dia, 'oracion')}
                  onToggle={() => toggleTarea(diaData.dia, 'oracion')}
                />
                <TareaCard
                  tipo="accion"
                  label="Acción del día"
                  emoji="✦"
                  contenido={diaData.accion}
                  completada={isTareaCompletada(diaData.dia, 'accion')}
                  onToggle={() => toggleTarea(diaData.dia, 'accion')}
                />
              </div>

              {/* Botón marcar día */}
              {!planTerminado && (
                <button
                  onClick={handleMarcarDia}
                  disabled={isDiaCompletado(diaData.dia)}
                  className={`w-full rounded-2xl py-3.5 font-semibold text-sm transition-all duration-150
                    ${isDiaCompletado(diaData.dia)
                      ? 'bg-dorado/20 text-dorado-dark dark:text-dorado border border-dorado/30 cursor-default'
                      : todasTareasDia(diaData.dia)
                        ? 'bg-dorado text-crema-50 shadow-md active:scale-[0.98]'
                        : 'bg-dorado/60 text-crema-50 shadow-sm active:scale-[0.98]'
                    }`}
                >
                  {isDiaCompletado(diaData.dia)
                    ? 'Día completado'
                    : todasTareasDia(diaData.dia)
                      ? 'Marcar día como completado'
                      : 'Completar día (podés hacerlo sin terminar todo)'
                  }
                </button>
              )}

              {planTerminado && (
                <div className="text-center py-4">
                  <p className="text-dorado font-serif text-lg font-semibold">Plan completado</p>
                  <p className="text-sm text-cafe-light dark:text-crema-300 mt-1">
                    Completaste los {totalDias} días del plan espiritual.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Configuración de notificaciones */}
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
              <div className="space-y-3 pt-1 pb-2 animate-fade-in">
                <div className="flex items-center justify-between bg-crema-100 dark:bg-oscuro-surface rounded-xl px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-cafe-dark dark:text-crema-200">Recordatorio diario</p>
                    <p className="text-xs text-cafe-light dark:text-crema-300">Notificación a la misma hora cada día</p>
                  </div>
                  <Toggle active={notifActiva} onChange={toggleNotificacion} />
                </div>
                {notifActiva && (
                  <div className="flex flex-col gap-2 px-1">
                    <label className="text-xs text-cafe-light dark:text-crema-300">Hora del recordatorio</label>
                    <TimePicker value={horaNotif} onChange={handleGuardarHora} />
                  </div>
                )}
                <button
                  onClick={() => { removePlanEspiritual(); setPhase('config') }}
                  className="w-full text-xs text-red-400 py-2 text-center"
                >
                  Abandonar este plan
                </button>
              </div>
            )}
          </div>

          <BugReportLink />
        </div>
      )}

      {/* ── FASE CELEBRACIÓN ──────────────────────────────────────────────── */}
      {phase === 'celebracion' && plan && (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #3D2000 0%, #1C0D00 60%, #261005 100%)' }}>

          {PARTICULAS.map((p, i) => (
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

          <div className="relative flex flex-col items-center gap-5 text-center px-8 animate-pop-in">
            <div className="w-24 h-24 rounded-full flex items-center justify-center mb-2"
              style={{ background: 'radial-gradient(circle, rgba(245,200,66,0.3) 0%, rgba(245,200,66,0.05) 70%)' }}>
              <svg viewBox="0 0 48 48" className="w-16 h-16 animate-shimmer" fill="none">
                <circle cx="24" cy="24" r="22" stroke="rgb(245,200,66)" strokeWidth="1.5" strokeDasharray="4 3" />
                <text x="24" y="32" textAnchor="middle" fontSize="26" fill="rgb(245,200,66)">✨</text>
              </svg>
            </div>

            <h2 className="font-serif text-3xl font-bold text-amber-100 leading-tight">
              ¡Plan completado!
            </h2>
            <p className="text-amber-300 text-base leading-relaxed max-w-xs">
              Completaste "{plan.titulo}". Que Dios bendiga tu esfuerzo y camino.
            </p>

            <button
              onClick={() => { removePlanEspiritual(); setPhase('config') }}
              className="mt-3 bg-amber-400 text-amber-950 rounded-2xl px-10 py-3.5 font-bold text-base shadow-lg active:scale-95 transition-transform"
            >
              Comenzar un nuevo plan
            </button>
          </div>
        </div>
      )}

      {/* Flash de éxito */}
      {showSuccess && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="animate-bounce-in flex flex-col items-center gap-3 bg-dorado rounded-3xl px-10 py-7 shadow-2xl">
            <div className="w-16 h-16 rounded-full bg-white/25 flex items-center justify-center">
              <svg viewBox="0 0 24 24" className="w-10 h-10 text-white" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p className="text-white font-semibold text-base tracking-wide">¡Día completado!</p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Sub-componentes ───────────────────────────────────────────────────────────

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-cafe-light dark:text-crema-300 uppercase tracking-wide mb-2">
        {label}
      </p>
      {children}
    </div>
  )
}

function pill(active: boolean) {
  return [
    'px-3 py-1.5 rounded-full text-xs border transition-all duration-150 active:scale-95',
    active
      ? 'bg-dorado text-white border-dorado shadow-sm'
      : 'bg-white dark:bg-oscuro-card border-crema-200 dark:border-oscuro-border text-cafe-light dark:text-crema-300 hover:border-dorado/50',
  ].join(' ')
}

function Toggle({ active, onChange }: { active: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!active)}
      className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${active ? 'bg-dorado' : 'bg-crema-300 dark:bg-oscuro-border'}`}
    >
      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 ${active ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

const SPARK_SYMBOLS = ['✦', '✸', '✶']
const SPARK_POSITIONS = [
  { x: -14, delay: 0,   duration: 0.7 },
  { x:   0, delay: 0.1, duration: 0.65 },
  { x:  14, delay: 0.05,duration: 0.75 },
]

function Sparkles() {
  return (
    <>
      {SPARK_POSITIONS.map((p, i) => (
        <span
          key={i}
          className="absolute pointer-events-none select-none text-dorado animate-float-particle"
          style={{
            left: `calc(50% + ${p.x}px)`,
            bottom: '50%',
            fontSize: '9px',
            '--delay': `${p.delay}s`,
            '--duration': `${p.duration}s`,
          } as CSSProperties}
        >
          {SPARK_SYMBOLS[i]}
        </span>
      ))}
    </>
  )
}

function TareaCard({
  tipo,
  label,
  emoji,
  contenido,
  completada,
  onToggle,
}: {
  tipo: string
  label: string
  emoji: string
  contenido: string
  completada: boolean
  onToggle: () => void
}) {
  const [verses, setVerses] = useState<{ number: number; text: string }[]>([])
  const [sparkKey, setSparkKey] = useState(0)

  useEffect(() => {
    if (tipo !== 'lectura') return
    let cancelled = false
    async function load() {
      const parsed = parseBibleRef(contenido)
      if (!parsed.length) return
      const { book, chapter, verses: verseNums } = parsed[0]
      try {
        const data = await getBibleChapter(book, chapter)
        if (cancelled) return
        const filtered = verseNums.length > 0
          ? data.verses.filter(v => verseNums.includes(v.number))
          : data.verses
        setVerses(filtered.slice(0, 8))
      } catch { /* referencia no encontrada — silencioso */ }
    }
    load()
    return () => { cancelled = true }
  }, [tipo, contenido])

  function handleToggle() {
    if (!completada) setSparkKey(k => k + 1)
    onToggle()
  }

  return (
    <div className={`rounded-2xl border transition-all duration-300 overflow-hidden
      ${completada
        ? 'border-dorado/40 bg-dorado/5 dark:bg-dorado/10'
        : 'border-crema-200 dark:border-oscuro-border bg-white dark:bg-oscuro-card'
      }`}
    >
      <div className="flex items-start gap-3 px-4 py-3">
        <span className="text-lg mt-0.5 flex-shrink-0">{emoji}</span>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-cafe-light dark:text-crema-400 mb-1">
            {label}
          </p>
          <p className={`text-sm leading-relaxed ${completada ? 'line-through text-cafe-light/60 dark:text-crema-400/60' : 'text-cafe-dark dark:text-crema-200'}`}>
            {contenido}
          </p>
          {tipo === 'lectura' && verses.length > 0 && (
            <div className="mt-2 pt-2 border-t border-crema-200/60 dark:border-oscuro-border/60 space-y-1.5 animate-fade-in">
              {verses.map(v => (
                <p key={v.number} className="font-serif text-[13px] leading-relaxed text-cafe-dark/80 dark:text-crema-200/75">
                  <span className="text-dorado font-bold text-[10px] mr-1.5 align-top leading-5 select-none">
                    {v.number}
                  </span>
                  {v.text}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="relative flex-shrink-0">
          {sparkKey > 0 && <Sparkles key={sparkKey} />}
          <button
            onClick={handleToggle}
            className={`w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all duration-200
              ${completada
                ? 'bg-dorado border-dorado scale-110'
                : 'border-crema-300 dark:border-oscuro-border bg-transparent hover:border-dorado/50 active:scale-90'
              }`}
          >
            {completada && (
              <svg viewBox="0 0 10 10" className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
                <path d="M1.5 5l2.5 2.5 4.5-4.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Partículas de celebración ─────────────────────────────────────────────────

const PARTICULAS = [
  { x: 8,  bottom: 5,  size: 18, symbol: '✦', delay: 0,   duration: 2.4 },
  { x: 20, bottom: 8,  size: 12, symbol: '✶', delay: 0.3, duration: 2.0 },
  { x: 35, bottom: 3,  size: 22, symbol: '✦', delay: 0.6, duration: 2.7 },
  { x: 50, bottom: 6,  size: 14, symbol: '✸', delay: 0.2, duration: 2.2 },
  { x: 65, bottom: 4,  size: 20, symbol: '✦', delay: 0.8, duration: 2.5 },
  { x: 78, bottom: 9,  size: 10, symbol: '✶', delay: 0.4, duration: 1.9 },
  { x: 88, bottom: 5,  size: 16, symbol: '✸', delay: 1.0, duration: 2.3 },
  { x: 95, bottom: 7,  size: 13, symbol: '✦', delay: 0.1, duration: 2.1 },
  { x: 15, bottom: 15, size: 10, symbol: '✶', delay: 1.2, duration: 2.6 },
  { x: 42, bottom: 12, size: 16, symbol: '✦', delay: 0.7, duration: 2.0 },
  { x: 60, bottom: 18, size: 11, symbol: '✸', delay: 0.5, duration: 2.4 },
  { x: 75, bottom: 10, size: 19, symbol: '✦', delay: 1.4, duration: 2.2 },
]
