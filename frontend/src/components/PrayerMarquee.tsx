import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

interface PrayerRequest {
  motivo: string
  nombre: string
}

const SIN_NOMBRE = 'Anónimo'

function formatRequest(req: PrayerRequest): string {
  const motivoLabel = req.motivo.split(' · ')[0]
  if (!req.nombre || req.nombre === SIN_NOMBRE) return motivoLabel
  return `${motivoLabel} · ${req.nombre}`
}

export default function PrayerMarquee() {
  const navigate = useNavigate()
  const [requests, setRequests] = useState<PrayerRequest[]>([])
  const [paused, setPaused] = useState(false)
  const marqueeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchRequests() {
      const { data, error } = await supabase
        .from('prayer_requests')
        .select('motivo, nombre')
        .order('created_at', { ascending: false })

      if (error || !data) return

      const seen = new Set<string>()
      const unique: PrayerRequest[] = []
      for (const row of data) {
        const key = `${row.motivo}|${row.nombre}`
        if (!seen.has(key)) {
          seen.add(key)
          unique.push({ motivo: row.motivo, nombre: row.nombre })
        }
      }
      setRequests(unique)
    }

    fetchRequests()
  }, [])

  if (requests.length === 0) return null

  const items = [...requests, ...requests]

  return (
    <div
      className="w-full overflow-hidden bg-dorado/10 dark:bg-dorado/15 border-b border-dorado/20
                 py-2 px-0 flex items-center gap-2 mb-4 rounded-none select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <style>{`
        @keyframes prayer-marquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .prayer-marquee-inner {
          animation: prayer-marquee 18s linear infinite;
          white-space: nowrap;
          will-change: transform;
          display: inline-flex;
          align-items: center;
        }
        .prayer-marquee-inner.paused {
          animation-play-state: paused;
        }
      `}</style>

      {/* "ORACIONES" — tap/click navega a la sección */}
      <button
        onClick={() => navigate('/comunidad/pedido-oracion')}
        className="flex items-center gap-1.5 flex-shrink-0 pl-3 text-dorado
                   active:opacity-60 transition-opacity"
        aria-label="Ir a pedidos de oración"
      >
        <Icon name="hands" size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Oraciones</span>
      </button>

      {/* Marquee — tap pausa/reanuda en mobile */}
      <div
        className="flex-1 overflow-hidden cursor-pointer"
        onClick={() => setPaused(p => !p)}
      >
        <div
          ref={marqueeRef}
          className={`prayer-marquee-inner${paused ? ' paused' : ''}`}
        >
          {items.map((req, i) => (
            <span key={i} className="inline-flex items-center">
              <span className="mx-4 text-dorado/25" aria-hidden>✦</span>
              <span className="text-xs font-semibold text-dorado dark:text-dorado/90">
                {formatRequest(req).split(' · ')[0]}
              </span>
              {formatRequest(req).includes(' · ') && (
                <span className="text-xs text-dorado/50 dark:text-dorado/40 ml-1.5">
                  · {formatRequest(req).split(' · ').slice(1).join(' · ')}
                </span>
              )}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
