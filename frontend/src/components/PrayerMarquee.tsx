import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import Icon from './Icon'

interface PrayerRequest {
  motivo: string
  nombre: string
}

const MOTIVO_PREP: Record<string, string> = {
  'Salud': 'por',
  'Trabajo': 'por',
  'Paz interior': 'por',
  'Familia': 'de',
  'Conversión': 'de',
  'Estudios': 'de',
  'Matrimonio': 'de',
  'Hijos': 'de',
  'Situación económica': 'de',
  'Fortaleza en la fe': 'de',
  'Intención particular': 'de',
}

function formatRequest(req: PrayerRequest): string {
  const prep = MOTIVO_PREP[req.motivo] ?? 'de'
  return `${req.motivo} ${prep} ${req.nombre}`
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

  const text = requests.map(formatRequest).join('  ·  ')
  // Duplicate for seamless loop
  const displayText = `${text}  ·  ${text}`

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
          className={`prayer-marquee-inner text-xs text-dorado/90 dark:text-dorado/80 font-medium${paused ? ' paused' : ''}`}
        >
          {displayText}
        </div>
      </div>
    </div>
  )
}
