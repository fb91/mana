import { useState, useEffect, useRef, useCallback } from 'react'
import Icon from './Icon'
import {
  IMAGE_THEMES,
  ImageConfig,
  ImageTheme,
  renderToCanvas,
  shareImage,
  downloadImage,
} from '../lib/verseImage'

export interface ImageEditorData {
  headerLabel: string
  verseRef: string
  verses: { number: number; text: string }[]
  footer?: string
  defaultThemeId?: string  // e.g. liturgical color mapped to theme id
}

interface Props {
  data: ImageEditorData
  onClose: () => void
}

function buildDefaultConfig(data: ImageEditorData): ImageConfig {
  const theme = IMAGE_THEMES.find(t => t.id === data.defaultThemeId) ?? IMAGE_THEMES[0]
  return {
    headerLabel: data.headerLabel,
    verseRef: data.verseRef,
    verses: data.verses,
    footer: data.footer ?? '',
    theme,
    fontSize: 'medium',
    textAlign: 'left',
    bgEffect: 'gradient-v',
    showVignette: true,
    ornament: 'none',
    frameStyle: 'none',
    textEffect: 'normal',
    showQuotes: true,
  }
}

// ── Small pill button ─────────────────────────────────────────────────────────
function Pill({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={[
        'px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150',
        active ? 'bg-white text-gray-900' : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
      ].join(' ')}
    >
      {children}
    </button>
  )
}

export default function ImageEditorModal({ data, onClose }: Props) {
  const [config, setConfig] = useState<ImageConfig>(() => buildDefaultConfig(data))
  const [exporting, setExporting] = useState(false)
  const [done, setDone] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Debounced canvas re-render on config change
  const scheduleRender = useCallback((cfg: ImageConfig) => {
    if (renderTimer.current) clearTimeout(renderTimer.current)
    renderTimer.current = setTimeout(() => {
      if (canvasRef.current) renderToCanvas(canvasRef.current, cfg)
    }, 30)
  }, [])

  useEffect(() => {
    scheduleRender(config)
  }, [config, scheduleRender])

  // Initial render
  useEffect(() => {
    if (canvasRef.current) renderToCanvas(canvasRef.current, config)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set<K extends keyof ImageConfig>(key: K, value: ImageConfig[K]) {
    setConfig(c => ({ ...c, [key]: value }))
  }

  async function handleShare() {
    setExporting(true)
    try {
      const slug = config.verseRef.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      await shareImage(config, `mana-${slug}.png`)
      setDone(true)
      setTimeout(onClose, 1400)
    } catch (err) {
      console.error(err)
    } finally {
      setExporting(false)
    }
  }

  async function handleDownload() {
    setExporting(true)
    try {
      const slug = config.verseRef.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()
      await downloadImage(config, `mana-${slug}.png`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-gray-950 overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0">
        <div>
          <h2 className="text-white font-semibold text-base leading-tight">Personalizar imagen</h2>
          <p className="text-gray-400 text-xs mt-0.5">{config.verseRef}</p>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 text-sm px-3 py-1.5 rounded-xl hover:bg-gray-800 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* ── Canvas Preview ─────────────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex items-center justify-center bg-gray-900 py-3">
        <canvas
          ref={canvasRef}
          width={540}
          height={960}
          className="rounded-xl shadow-2xl ring-1 ring-white/10"
          style={{ height: '100%', width: 'auto', maxHeight: '100%', maxWidth: '90%' }}
        />
      </div>

      {/* ── Controls ───────────────────────────────────────────────────────────── */}
      <div
        className="shrink-0 bg-gray-950 border-t border-gray-800 overflow-y-auto"
        style={{ maxHeight: '46vh' }}
      >

        {/* ── Theme swatches ── */}
        <div className="px-4 pt-4 pb-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2.5">Estilo</p>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
            {IMAGE_THEMES.map((theme: ImageTheme) => (
              <button
                key={theme.id}
                onClick={() => set('theme', theme)}
                className={[
                  'flex-none w-[52px] rounded-xl overflow-hidden transition-all duration-150',
                  config.theme.id === theme.id
                    ? 'ring-2 ring-white scale-105'
                    : 'ring-1 ring-white/10 opacity-70 hover:opacity-100',
                ].join(' ')}
              >
                <div
                  style={{ background: theme.bg }}
                  className="h-9 flex items-center justify-center"
                >
                  <span
                    style={{ color: theme.accent }}
                    className="font-serif text-sm font-bold leading-none select-none"
                  >
                    Aa
                  </span>
                </div>
                <div className="bg-gray-900 py-1">
                  <p className="text-[9px] text-gray-400 text-center leading-tight">{theme.name}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ── Background effect ── */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Fondo</p>
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['solid',           'Sólido'],
              ['gradient-v',      'Degradé'],
              ['gradient-radial', 'Radial'],
              ['light-leak',      'Luz'],
              ['bokeh',           'Bokeh'],
            ] as [ImageConfig['bgEffect'], string][]).map(([val, label]) => (
              <Pill key={val} active={config.bgEffect === val} onClick={() => set('bgEffect', val)}>
                {label}
              </Pill>
            ))}
          </div>
        </div>

        {/* ── Font size + alignment ── */}
        <div className="px-4 pb-3 flex gap-4">
          <div className="flex-1">
            <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Tamaño</p>
            <div className="flex gap-1.5">
              {(['small', 'medium', 'large'] as const).map(size => (
                <Pill key={size} active={config.fontSize === size} onClick={() => set('fontSize', size)}>
                  {size === 'small' ? 'S' : size === 'medium' ? 'M' : 'L'}
                </Pill>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Alineación</p>
            <div className="flex gap-1.5">
              {([['left', '≡ Izq.'], ['center', '☰ Cen.']] as const).map(([align, label]) => (
                <Pill key={align} active={config.textAlign === align} onClick={() => set('textAlign', align)}>
                  {label}
                </Pill>
              ))}
            </div>
          </div>
        </div>

        {/* ── Text effect ── */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Efecto de texto</p>
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['normal',  'Normal'],
              ['shadow',  'Sombra'],
              ['outline', 'Contorno'],
            ] as [ImageConfig['textEffect'], string][]).map(([val, label]) => (
              <Pill key={val} active={config.textEffect === val} onClick={() => set('textEffect', val)}>
                {label}
              </Pill>
            ))}
          </div>
        </div>

        {/* ── Ornament ── */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Ornamento</p>
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['none',        'Ninguno'],
              ['cross',       '✝ Cruz'],
              ['ichthys',     '𓆝 Pez'],
              ['alpha-omega', 'α ω'],
              ['stars',       '✦ Estrellas'],
            ] as [ImageConfig['ornament'], string][]).map(([val, label]) => (
              <Pill key={val} active={config.ornament === val} onClick={() => set('ornament', val)}>
                {label}
              </Pill>
            ))}
          </div>
        </div>

        {/* ── Frame ── */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Marco</p>
          <div className="flex gap-1.5 flex-wrap">
            {([
              ['none',   'Ninguno'],
              ['line',   'Línea'],
              ['double', 'Doble'],
              ['ornate', 'Ornato'],
            ] as [ImageConfig['frameStyle'], string][]).map(([val, label]) => (
              <Pill key={val} active={config.frameStyle === val} onClick={() => set('frameStyle', val)}>
                {label}
              </Pill>
            ))}
          </div>
        </div>

        {/* ── Toggles: vignette + quotes ── */}
        <div className="px-4 pb-3">
          <p className="text-[11px] text-gray-500 uppercase tracking-widest mb-2">Detalles</p>
          <div className="flex gap-2 flex-wrap">
            {([
              ['showVignette', 'Viñeta'],
              ['showQuotes',   'Comillas'],
            ] as [keyof Pick<ImageConfig, 'showVignette' | 'showQuotes'>, string][]).map(([key, label]) => (
              <button
                key={key}
                onClick={() => setConfig(c => ({ ...c, [key]: !c[key] }))}
                className={[
                  'px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 flex items-center gap-1.5',
                  config[key]
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                ].join(' ')}
              >
                {config[key] && <Icon name="check" size={11} />}
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Action buttons ── */}
        <div className="px-4 pb-6 pt-1 flex gap-2.5">
          {done ? (
            <div className="flex-1 py-3.5 rounded-2xl bg-green-600 flex items-center justify-center gap-2">
              <Icon name="check" size={18} className="text-white" />
              <span className="text-white font-semibold text-sm">¡Listo!</span>
            </div>
          ) : (
            <button
              onClick={handleShare}
              disabled={exporting}
              className="flex-1 py-3.5 rounded-2xl bg-dorado text-crema-50 font-semibold text-sm
                         flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]
                         transition-all duration-150"
            >
              <Icon name="share" size={17} />
              {exporting ? 'Generando...' : 'Compartir'}
            </button>
          )}
          <button
            onClick={handleDownload}
            disabled={exporting}
            className="w-12 rounded-2xl bg-gray-800 text-gray-300 flex items-center justify-center
                       disabled:opacity-50 hover:bg-gray-700 active:scale-95 transition-all duration-150"
            title="Descargar imagen"
          >
            <svg
              className="w-4 h-4"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}
