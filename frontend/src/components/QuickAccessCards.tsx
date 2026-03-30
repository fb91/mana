import { useNavigate } from 'react-router-dom'
import Icon from './Icon'
import { slugify } from '../lib/slugify'
import type { NovenaProgreso, PlanEspiritualProgreso } from '../store/useAppStore'

// "/biblia/Gn/1" → "Génesis · Capítulo 1"
const BIBLE_NAMES: Record<string, string> = {
  Gn: 'Génesis', Ex: 'Éxodo', Lv: 'Levítico', Nm: 'Números', Dt: 'Deuteronomio',
  Jos: 'Josué', Jue: 'Jueces', Rt: 'Rut', '1Sam': '1 Samuel', '2Sam': '2 Samuel',
  '1Re': '1 Reyes', '2Re': '2 Reyes', '1Cr': '1 Crónicas', '2Cr': '2 Crónicas',
  Esd: 'Esdras', Neh: 'Nehemías', Tb: 'Tobías', Jdt: 'Judit', Est: 'Ester',
  '1Mac': '1 Macabeos', '2Mac': '2 Macabeos', Job: 'Job', Sal: 'Salmos',
  Pr: 'Proverbios', Ecl: 'Eclesiastés', Ct: 'Cantares', Sab: 'Sabiduría',
  Sir: 'Eclesiástico', Is: 'Isaías', Jr: 'Jeremías', Lm: 'Lamentaciones',
  Bar: 'Baruc', Ez: 'Ezequiel', Dn: 'Daniel', Os: 'Oseas', Jl: 'Joel',
  Am: 'Amós', Abd: 'Abdías', Jon: 'Jonás', Mi: 'Miqueas', Na: 'Nahúm',
  Hab: 'Habacuc', Sof: 'Sofonías', Ag: 'Ageo', Za: 'Zacarías', Mal: 'Malaquías',
  Mt: 'Mateo', Mc: 'Marcos', Lc: 'Lucas', Jn: 'Juan', Hch: 'Hechos',
  Rm: 'Romanos', '1Co': '1 Corintios', '2Co': '2 Corintios', Ga: 'Gálatas',
  Ef: 'Efesios', Flp: 'Filipenses', Col: 'Colosenses', '1Ts': '1 Tesalonicenses',
  '2Ts': '2 Tesalonicenses', '1Tm': '1 Timoteo', '2Tm': '2 Timoteo',
  Tt: 'Tito', Flm: 'Filemón', Hb: 'Hebreos', St: 'Santiago',
  '1Pe': '1 Pedro', '2Pe': '2 Pedro', '1Jn': '1 Juan', '2Jn': '2 Juan',
  '3Jn': '3 Juan', Jds: 'Judas', Ap: 'Apocalipsis',
}

export function formatBiblePath(path: string): string {
  const match = path.match(/^\/biblia\/([^/]+)\/(\d+)/)
  if (!match) return 'Biblia'
  const [, abbr, chapter] = match
  return `${BIBLE_NAMES[abbr] ?? abbr} · Capítulo ${chapter}`
}

interface Props {
  novenaActiva: NovenaProgreso | null
  diaSiguiente: number | null
  planActivo: PlanEspiritualProgreso | null
  diaPlanSiguiente: number | null
}

export default function QuickAccessCards({ novenaActiva, diaSiguiente, planActivo, diaPlanSiguiente }: Props) {
  const navigate = useNavigate()

  return (
    <>
      {/* Mobile */}
      <div className="lg:hidden">
        {novenaActiva && diaSiguiente && diaSiguiente <= 9 && (
          <button
            onClick={() => navigate(`/novenas/${slugify(novenaActiva.nombreNovena)}`)}
            className="w-full mb-3 rounded-2xl text-left flex items-center gap-4 px-5 py-4
                       bg-dorado/15 dark:bg-dorado/10 border border-dorado/30
                       active:scale-[0.98] transition-all duration-200"
          >
            <Icon name="beads" size={20} className="text-dorado flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-dorado/70 mb-0.5">
                Rezar oración del día
              </p>
              <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight truncate">
                Día {diaSiguiente} — {novenaActiva.nombreNovena.replace('Novena a ', '').replace('Novena al ', '')}
              </p>
              {novenaActiva.intencion && (
                <p className="text-xs text-cafe-light dark:text-crema-400 truncate mt-0.5 italic">
                  {novenaActiva.intencion}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-dorado font-semibold">{novenaActiva.diasCompletados.length}/9</span>
              <Icon name="chevron-right" size={16} className="text-dorado/50" />
            </div>
          </button>
        )}
        {planActivo && diaPlanSiguiente && (
          <button
            onClick={() => navigate('/asistente')}
            className="w-full mb-3 rounded-2xl text-left flex items-center gap-4 px-5 py-4
                       bg-dorado/10 dark:bg-dorado/8 border border-dorado/25
                       active:scale-[0.98] transition-all duration-200"
          >
            <Icon name="sparkles" size={20} className="text-dorado flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-dorado/70 mb-0.5">
                Plan espiritual · Día {diaPlanSiguiente}
              </p>
              <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight truncate">
                {planActivo.plan.plan.find(d => d.dia === diaPlanSiguiente)?.tema ?? planActivo.plan.titulo}
              </p>
              <p className="text-xs text-cafe-light dark:text-crema-400 truncate mt-0.5">
                {planActivo.plan.plan.find(d => d.dia === diaPlanSiguiente)?.lectura}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-dorado font-semibold">{planActivo.diasCompletados.length}/{planActivo.plan.duracionDias}</span>
              <Icon name="chevron-right" size={16} className="text-dorado/50" />
            </div>
          </button>
        )}
      </div>

      {/* Desktop: novena card */}
      <div className="hidden lg:block mb-6">
        {novenaActiva && diaSiguiente && diaSiguiente <= 9 ? (
          <button
            onClick={() => navigate(`/novenas/${slugify(novenaActiva.nombreNovena)}`)}
            className="w-full rounded-2xl text-left flex items-center gap-4 px-5 py-4
                       bg-dorado/15 dark:bg-dorado/10 border border-dorado/30
                       active:scale-[0.98] transition-all duration-200 hover:border-dorado/50 hover:shadow-sm"
          >
            <Icon name="beads" size={20} className="text-dorado flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-dorado/70 mb-0.5">
                Rezar oración del día
              </p>
              <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight truncate">
                Día {diaSiguiente} — {novenaActiva.nombreNovena.replace('Novena a ', '').replace('Novena al ', '')}
              </p>
              {novenaActiva.intencion && (
                <p className="text-xs text-cafe-light dark:text-crema-400 truncate mt-0.5 italic">
                  {novenaActiva.intencion}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className="text-xs text-dorado font-semibold">{novenaActiva.diasCompletados.length}/9</span>
              <Icon name="chevron-right" size={16} className="text-dorado/50" />
            </div>
          </button>
        ) : (
          <button
            onClick={() => navigate('/novenas')}
            className="w-full rounded-2xl text-left flex items-center gap-4 px-5 py-4
                       bg-crema-100 dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                       active:scale-[0.98] transition-all duration-200 hover:border-dorado/30 hover:shadow-sm"
          >
            <Icon name="beads" size={20} className="text-cafe-light dark:text-crema-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-semibold text-cafe-light dark:text-crema-400 mb-0.5">
                Oración del día
              </p>
              <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight">
                Comenzar una novena
              </p>
              <p className="text-xs text-cafe-light/70 dark:text-crema-400/70 mt-0.5">
                Acompañate con la intercesión de los santos
              </p>
            </div>
            <Icon name="chevron-right" size={18} className="text-cafe-light/40 dark:text-crema-400/40 flex-shrink-0" />
          </button>
        )}
      </div>

      {/* Plan espiritual activo — desktop */}
      {planActivo && diaPlanSiguiente && (
        <button
          onClick={() => navigate('/asistente')}
          className="hidden lg:flex w-full mb-4 rounded-2xl text-left items-center gap-4 px-5 py-4
                     bg-dorado/10 dark:bg-dorado/8 border border-dorado/25
                     active:scale-[0.98] transition-all duration-200 hover:border-dorado/40 hover:shadow-sm"
        >
          <Icon name="sparkles" size={20} className="text-dorado flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider font-semibold text-dorado/70 mb-0.5">
              Plan espiritual · Día {diaPlanSiguiente}
            </p>
            <p className="font-serif font-semibold text-cafe-dark dark:text-crema-200 leading-tight truncate">
              {planActivo.plan.plan.find(d => d.dia === diaPlanSiguiente)?.tema ?? planActivo.plan.titulo}
            </p>
            <p className="text-xs text-cafe-light dark:text-crema-400 truncate mt-0.5">
              {planActivo.plan.plan.find(d => d.dia === diaPlanSiguiente)?.lectura}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            <span className="text-xs text-dorado font-semibold">{planActivo.diasCompletados.length}/{planActivo.plan.duracionDias}</span>
            <Icon name="chevron-right" size={16} className="text-dorado/50" />
          </div>
        </button>
      )}
    </>
  )
}
