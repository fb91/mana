import { useState, useEffect, useCallback } from 'react'
import PageHeader from '../components/PageHeader'
import Icon, { IconName } from '../components/Icon'
import { api, ExamenData, ExamenPerfil } from '../services/api'

type Phase = 'loading' | 'select_profile' | 'intro' | 'questions'

const PROFILE_ICONS: Record<string, IconName> = {
  adultos: 'user',
  jovenes: 'sparkles',
  ninos: 'star',
}

export default function ExamenPage() {
  const [phase, setPhase] = useState<Phase>('loading')
  const [data, setData] = useState<ExamenData | null>(null)
  const [perfil, setPerfil] = useState<ExamenPerfil | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState('')

  useEffect(() => {
    api.getExamenData()
      .then(d => { setData(d); setPhase('select_profile') })
      .catch(() => { setError('No se pudo cargar el examen. Reintentá.'); setPhase('select_profile') })
  }, [])

  const handleSelectPerfil = (p: ExamenPerfil) => {
    setPerfil(p)
    setSelected(new Set())
    setPhase('intro')
  }

  const handleReset = useCallback(() => {
    setPerfil(null)
    setSelected(new Set())
    setPhase('select_profile')
  }, [])

  const toggleQuestion = useCallback((q: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(q)) next.delete(q)
      else next.add(q)
      return next
    })
  }, [])

  // Sections for current perfil
  const getSections = (p: ExamenPerfil) => {
    if (p.secciones) return p.secciones
    // niños: flat list → wrap in one section
    return [{ id: 'todas', titulo: 'Preguntas para reflexionar', preguntas: p.preguntas ?? [] }]
  }

  const handleDownload = useCallback(() => {
    if (!perfil || !data || selected.size === 0) return
    const sections = getSections(perfil)

    const sectionsHtml = sections.map(sec => {
      const qs = sec.preguntas.filter(q => selected.has(q))
      if (qs.length === 0) return ''
      return `
        <h2>${sec.titulo}</h2>
        ${qs.map(q => `<p class="question">• ${q}</p>`).join('')}
      `
    }).join('')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Mi Examen de Conciencia — ${perfil.label}</title>
  <style>
    body { font-family: Georgia, serif; max-width: 620px; margin: 40px auto; padding: 20px 28px; color: #2D1B0E; line-height: 1.7; }
    h1 { color: #8B6914; font-size: 22px; margin-bottom: 4px; }
    .perfil { color: #7A5C2E; font-size: 13px; margin-bottom: 24px; }
    h2 { color: #5C4A1A; font-size: 15px; margin-top: 28px; margin-bottom: 8px; border-bottom: 1px solid #E8D9C0; padding-bottom: 4px; }
    .question { font-size: 13.5px; padding: 6px 0; border-bottom: 1px dashed #F0E6D0; margin: 0; }
    .contricion { background: #FFF8E7; border-left: 3px solid #C9A227; padding: 14px 18px; border-radius: 6px; margin-top: 32px; font-style: italic; font-size: 13px; }
    .contricion strong { display: block; margin-bottom: 8px; font-style: normal; color: #8B6914; }
    .footer { font-size: 11px; color: #999; margin-top: 32px; text-align: center; }
    @media print { body { margin: 20px; } }
  </style>
</head>
<body>
  <h1>Mi Examen de Conciencia</h1>
  <p class="perfil">Perfil: ${perfil.label} &nbsp;·&nbsp; ${selected.size} pregunta${selected.size !== 1 ? 's' : ''} seleccionada${selected.size !== 1 ? 's' : ''}</p>
  ${sectionsHtml}
  <div class="contricion">
    <strong>Oración de contrición</strong>
    ${data.oracion_contricion}
  </div>
  ${perfil.nota_final ? `<p style="margin-top:16px;font-style:italic;font-size:13px;color:#7A5C2E">${perfil.nota_final}</p>` : ''}
  <p class="footer">Generado con Maná · maná.app</p>
  <script>window.onload = function(){ window.print() }<\/script>
</body>
</html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
    }
  }, [perfil, data, selected])

  return (
    <div className="flex flex-col h-screen">
      <PageHeader
        icon={<Icon name="clipboard" size={18} />}
        title="Examen de Conciencia"
        subtitle={perfil ? perfil.label : 'Preparación para la confesión'}
        onReset={phase !== 'select_profile' && phase !== 'loading' ? handleReset : undefined}
      />

      {/* ── LOADING ── */}
      {phase === 'loading' && (
        <div className="flex-1 flex items-center justify-center animate-pulse-soft">
          <div className="text-center">
            <span className="text-4xl">🕊️</span>
            <p className="text-cafe-light dark:text-crema-300 text-sm mt-3">Cargando...</p>
          </div>
        </div>
      )}

      {/* ── SELECT PROFILE ── */}
      {phase === 'select_profile' && (
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 animate-fade-in">
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          <p className="text-center text-cafe-light dark:text-crema-300 text-sm mb-6 max-w-sm mx-auto">
            Seleccioná tu perfil para ver las preguntas más adecuadas para vos.
          </p>

          <div className="space-y-3 max-w-sm mx-auto">
            {data?.perfiles.map(p => (
              <button
                key={p.id}
                onClick={() => handleSelectPerfil(p)}
                className="w-full card text-left flex items-center gap-4 hover:border-dorado/50 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-xl bg-dorado/10 flex items-center justify-center text-dorado flex-shrink-0">
                  <Icon name={PROFILE_ICONS[p.id] ?? 'clipboard'} size={20} />
                </div>
                <div>
                  <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200">{p.label}</p>
                  <p className="text-xs text-cafe-light dark:text-crema-300 mt-0.5">
                    {p.secciones
                      ? `${p.secciones.reduce((acc, s) => acc + s.preguntas.length, 0)} preguntas en ${p.secciones.length} secciones`
                      : `${p.preguntas?.length ?? 0} preguntas`}
                  </p>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-8 max-w-sm mx-auto">
            <div className="card bg-crema-100 dark:bg-oscuro-surface text-center py-4">
              <p className="text-dorado font-serif text-sm italic">
                "Examináos a vosotros mismos para ver si estáis en la fe"
              </p>
              <p className="text-xs text-cafe-light dark:text-crema-300 mt-1">— 2 Corintios 13:5</p>
            </div>
          </div>
        </div>
      )}

      {/* ── INTRO ── */}
      {phase === 'intro' && perfil && (
        <div className="flex-1 overflow-y-auto px-4 py-6 pb-28 animate-fade-in">
          <div className="max-w-sm mx-auto space-y-5">

            {/* Cita del Papa */}
            <div className="card bg-crema-50 dark:bg-oscuro-surface border-l-4 border-dorado px-4 py-4">
              <p className="text-sm italic leading-relaxed text-cafe-dark dark:text-crema-200">
                "{perfil.introduccion.cita_papa_francisco}"
              </p>
              <p className="text-xs text-cafe-light dark:text-crema-400 mt-2">— Papa Francisco</p>
            </div>

            {/* Definición */}
            <div className="card px-4 py-4">
              <p className="text-sm leading-relaxed text-cafe-dark dark:text-crema-200">
                {perfil.introduccion.definicion}
              </p>
              {perfil.introduccion.nota && (
                <p className="text-xs text-cafe-light dark:text-crema-400 mt-2 italic">{perfil.introduccion.nota}</p>
              )}
            </div>

            {/* Instrucciones de uso */}
            <div className="card border-dorado/30 px-4 py-4 space-y-3">
              <p className="text-xs uppercase tracking-wider text-cafe-light dark:text-crema-400 font-semibold">
                ¿Cómo funciona?
              </p>
              {[
                { icon: '👈', text: 'Deslizá hacia los costados dentro de cada sección para explorar todas las preguntas.' },
                { icon: '✋', text: 'Tocá una pregunta para seleccionarla. Se iluminará en dorado.' },
                { icon: '💛', text: 'Seleccioná las preguntas que te tocan el corazón y que querés llevarte a la confesión.' },
                { icon: '⬇️', text: 'Cuando termines, descargá tu examen personalizado para tenerlo a mano.' },
              ].map(({ icon, text }, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="text-xl flex-shrink-0">{icon}</span>
                  <p className="text-sm text-cafe-dark dark:text-crema-200 leading-snug">{text}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => setPhase('questions')}
              className="btn-primary w-full"
            >
              Explorar las preguntas
            </button>
          </div>
        </div>
      )}

      {/* ── QUESTIONS ── */}
      {phase === 'questions' && perfil && (
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto py-4">

            {getSections(perfil).map(sec => (
              <div key={sec.id} className="mb-6">
                {/* Section header */}
                <div className="px-4 mb-3 flex items-center gap-2">
                  <span className="text-dorado text-xs font-bold uppercase tracking-wider">
                    {sec.titulo}
                  </span>
                  <span className="text-xs text-cafe-light dark:text-crema-500">
                    · {sec.preguntas.filter(q => selected.has(q)).length}/{sec.preguntas.length} seleccionadas
                  </span>
                </div>

                {/* Horizontal scrollable question strip */}
                <div className="flex gap-3 overflow-x-auto px-4 pb-2 scrollbar-hide snap-x snap-mandatory">
                  {sec.preguntas.map((q, i) => {
                    const isSelected = selected.has(q)
                    return (
                      <button
                        key={i}
                        onClick={() => toggleQuestion(q)}
                        className={[
                          'flex-shrink-0 w-52 text-left px-4 py-3 rounded-2xl border text-sm leading-relaxed transition-all duration-150 active:scale-[0.97] snap-start',
                          isSelected
                            ? 'bg-dorado text-white border-dorado shadow-md'
                            : 'bg-white dark:bg-oscuro-card border-crema-200 dark:border-oscuro-border text-cafe-dark dark:text-crema-200 hover:border-dorado/50',
                        ].join(' ')}
                      >
                        {isSelected && (
                          <span className="block text-[10px] font-bold mb-1.5 opacity-75 uppercase tracking-wide">
                            ✓ Seleccionada
                          </span>
                        )}
                        {q}
                      </button>
                    )
                  })}

                  {/* End-of-section spacer */}
                  <div className="flex-shrink-0 w-4" />
                </div>
              </div>
            ))}

            {/* Extra padding so content isn't hidden behind sticky bar */}
            <div className="h-24" />
          </div>

          {/* Sticky download bar */}
          <div className={[
            'border-t border-crema-200 dark:border-oscuro-border bg-white dark:bg-oscuro-card px-4 py-3 transition-all duration-300',
            selected.size > 0 ? 'shadow-lg' : 'opacity-60',
          ].join(' ')}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-cafe-dark dark:text-crema-200">
                {selected.size === 0
                  ? 'Tocá una pregunta para seleccionarla'
                  : `${selected.size} pregunta${selected.size !== 1 ? 's' : ''} seleccionada${selected.size !== 1 ? 's' : ''}`}
              </p>
              <button
                onClick={handleDownload}
                disabled={selected.size === 0}
                className="btn-primary text-sm py-2 px-4 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
              >
                <span>⬇</span>
                <span>Descargar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
