import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

interface PrayerRequest {
  motivo: string
  nombre: string
}

const SIN_NOMBRE = 'Anónimo'

function formatRequest(req: PrayerRequest): string {
  // motivo may be "Salud · Cirugía (urgente)" or legacy "Salud"
  const motivoLabel = req.motivo.split(' · ')[0]
  if (!req.nombre || req.nombre === SIN_NOMBRE) return motivoLabel
  return `${motivoLabel} · ${req.nombre}`
}

export default function PrayerMarquee() {
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

      // Deduplicate by motivo+nombre combo
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

  // Duplicate for seamless loop
  const items = [...requests, ...requests]

  return (
    <div
      className="w-full overflow-hidden bg-dorado/10 dark:bg-dorado/15 border-b border-dorado/20
                 py-2 px-0 flex items-center gap-2 mb-4 rounded-xl lg:rounded-none"
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

      <div className="flex items-center gap-1.5 flex-shrink-0 pl-3 text-dorado">
        <Icon name="hands" size={14} />
        <span className="text-[10px] font-bold uppercase tracking-widest">Oraciones</span>
      </div>

      <div className="flex-1 overflow-hidden">
        <div
          ref={marqueeRef}
          className={`prayer-marquee-inner${paused ? ' paused' : ''}`}
        >
          {items.map((req, i) => (
            <span key={i} className="inline-flex items-center">
              {/* Separator between items — visually distinct from content */}
              <span className="mx-4 text-dorado/25 select-none" aria-hidden>✦</span>
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
