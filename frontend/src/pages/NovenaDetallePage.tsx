import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Novena } from '../services/api'
import novenasJson from '../data/novenas.json'
import PageHeader from '../components/PageHeader'
import Icon from '../components/Icon'
import { BugReportLink } from '../components/BugReportButton'

const novenas = novenasJson as Novena[]

export default function NovenaDetallePage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [diaSeleccionado, setDiaSeleccionado] = useState(1)

  const novena = novenas.find(n => n.id === Number(id))

  if (!novena) {
    navigate('/novenas')
    return null
  }

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
            {diaActual.reflexion && (
              <div className="mb-4 card bg-crema-100 dark:bg-oscuro-surface">
                <p className="text-xs font-semibold text-dorado mb-2 uppercase tracking-wide">
                  Reflexión
                </p>
                <p className="text-sm text-cafe-dark dark:text-crema-200 leading-relaxed italic">
                  {diaActual.reflexion}
                </p>
              </div>
            )}
            <div className="card">
              <p className="text-sm leading-relaxed text-cafe-dark dark:text-crema-200 whitespace-pre-wrap">
                {diaActual.oracion}
              </p>
            </div>
          </div>
        )}

        <BugReportLink />

      </div>
    </div>
  )
}
