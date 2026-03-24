// StoryImageEditor — Konva-based vertical story image editor (9:16)
// Mobile-first, 100% client-side, exports at 1080×1920.
import { useState, useRef, useEffect, useMemo } from 'react'
import Konva from 'konva'
import { Stage, Layer, Rect, Text, Transformer } from 'react-konva'

// ── Canvas dimensions (logical) ───────────────────────────────────────────────
const CANVAS_W = 1080
const CANVAS_H = 1920

// ── Template definitions ──────────────────────────────────────────────────────
interface ElementDef {
  id: string
  role: 'main' | 'reference'
  x: number
  y: number
  width: number
  /** Base font size at 1080px width; auto-scaled down when text is long */
  fontSize: number
  align: 'left' | 'center' | 'right'
  /** Konva fontStyle string: 'normal' | 'bold' | 'italic' | 'italic bold' */
  fontStyle: string
}

interface TemplateDef {
  id: string
  name: string
  bg: string   // gradient start color
  bg2: string  // gradient end color
  textColor: string
  subColor: string
  elements: ElementDef[]
}

export const STORY_TEMPLATES: TemplateDef[] = [
  {
    id: 'centered_quote',
    name: 'Centrado',
    bg: '#1E1035',
    bg2: '#080618',
    textColor: '#EDE9FE',
    subColor: '#A78BFA',
    elements: [
      {
        id: 'main', role: 'main',
        x: 100, y: 680, width: 880,
        fontSize: 52, align: 'center', fontStyle: 'normal',
      },
      {
        id: 'ref', role: 'reference',
        x: 100, y: 1720, width: 880,
        fontSize: 40, align: 'center', fontStyle: 'italic',
      },
    ],
  },
  {
    id: 'bottom_caption',
    name: 'Pie',
    bg: '#0C2340',
    bg2: '#040D1A',
    textColor: '#EFF6FF',
    subColor: '#93C5FD',
    elements: [
      {
        id: 'main', role: 'main',
        x: 80, y: 1080, width: 920,
        fontSize: 58, align: 'left', fontStyle: 'normal',
      },
      {
        id: 'ref', role: 'reference',
        x: 80, y: 1790, width: 920,
        fontSize: 36, align: 'left', fontStyle: 'italic',
      },
    ],
  },
  {
    id: 'top_bottom',
    name: 'División',
    bg: '#1A3A1A',
    bg2: '#071307',
    textColor: '#F0FDF4',
    subColor: '#86EFAC',
    elements: [
      {
        id: 'ref', role: 'reference',
        x: 100, y: 180, width: 880,
        fontSize: 48, align: 'center', fontStyle: 'italic bold',
      },
      {
        id: 'main', role: 'main',
        x: 100, y: 820, width: 880,
        fontSize: 52, align: 'center', fontStyle: 'normal',
      },
    ],
  },
  {
    id: 'dorado',
    name: 'Dorado',
    bg: '#78450A',
    bg2: '#2E1600',
    textColor: '#FFFBEB',
    subColor: '#FCD34D',
    elements: [
      {
        id: 'main', role: 'main',
        x: 90, y: 560, width: 900,
        fontSize: 56, align: 'center', fontStyle: 'normal',
      },
      {
        id: 'ref', role: 'reference',
        x: 90, y: 1730, width: 900,
        fontSize: 38, align: 'center', fontStyle: 'italic',
      },
    ],
  },
]

// ── Font options ──────────────────────────────────────────────────────────────
const FONTS = [
  { id: 'serif',   label: 'Clásica',  family: 'Georgia, "Times New Roman", serif' },
  { id: 'sans',    label: 'Moderna',  family: 'system-ui, -apple-system, "Segoe UI", sans-serif' },
  { id: 'display', label: 'Elegante', family: 'Palatino, "Book Antiqua", Georgia, serif' },
] as const

type FontId = typeof FONTS[number]['id']

// ── Active element (runtime state) ────────────────────────────────────────────
interface ActiveElement extends ElementDef {
  text: string
  color: string
}

function buildElements(t: TemplateDef, mainText: string, refText: string): ActiveElement[] {
  return t.elements.map(el => ({
    ...el,
    text: el.role === 'main' ? mainText : refText,
    color: el.role === 'main' ? t.textColor : t.subColor,
  }))
}

// ── Auto font-size via offscreen Konva.Text measurement ───────────────────────
// Binary search: ~5 iterations instead of up to 50 with linear scan.
function fitFontSize(
  text: string,
  fontFamily: string,
  fontStyle: string,
  width: number,
  maxHeight: number,
  startSize: number,
): number {
  if (!text) return startSize
  const probe = new Konva.Text({
    text, fontFamily, fontStyle,
    fontSize: startSize,
    width,
    wrap: 'word',
    lineHeight: 1.55,
  })
  // Fast path: text already fits
  if (probe.height() <= maxHeight) { probe.destroy(); return startSize }
  let lo = 22, hi = startSize
  while (hi - lo > 2) {
    const mid = Math.floor((lo + hi) / 2)
    probe.setAttr('fontSize', mid)
    if (probe.height() > maxHeight) hi = mid
    else lo = mid
  }
  probe.destroy()
  return lo
}

// ── Template thumbnail (CSS-only, 9:16) ───────────────────────────────────────
function TemplateThumbnail({
  tpl, selected, onClick,
}: {
  tpl: TemplateDef
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      aria-label={`Plantilla ${tpl.name}`}
      className={[
        'flex-none rounded-xl overflow-hidden transition-all duration-150',
        selected
          ? 'ring-2 ring-white scale-105'
          : 'ring-1 ring-white/20 opacity-60 hover:opacity-90 active:scale-95',
      ].join(' ')}
      style={{ width: 46, height: 82 }}  /* ≈ 9:16 */
    >
      <div
        className="w-full h-full flex flex-col items-stretch justify-center gap-1.5 px-2"
        style={{ background: `linear-gradient(to bottom, ${tpl.bg}, ${tpl.bg2})` }}
      >
        {tpl.elements.map((el, i) => (
          <div
            key={i}
            className="rounded-full"
            style={{
              height: 2.5,
              background: el.role === 'main' ? tpl.textColor : tpl.subColor,
              opacity: 0.75,
              width: el.align === 'left' ? '90%' : '70%',
              alignSelf: el.align === 'left' ? 'flex-start' : 'center',
            }}
          />
        ))}
      </div>
    </button>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
export interface StoryEditorProps {
  text: string
  reference?: string
  onClose: () => void
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StoryImageEditor({ text, reference = '', onClose }: StoryEditorProps) {
  const [template, setTemplate]     = useState<TemplateDef>(STORY_TEMPLATES[0])
  const [elements, setElements]     = useState<ActiveElement[]>(() =>
    buildElements(STORY_TEMPLATES[0], text, reference))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [editingId, setEditingId]   = useState<string | null>(null)
  const [fontId, setFontId]         = useState<FontId>('serif')
  const [sizeOverrides, setSizeOverrides] = useState<Map<string, number>>(new Map())
  // stageWidth starts at a viewport-based estimate so Stage renders immediately
  const [stageWidth, setStageWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 300
    // Rough guess: 55% of viewport height → width at 9:16
    return Math.round(window.innerHeight * 0.55 * (9 / 16))
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stageRef   = useRef<any>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const trRef      = useRef<any>(null)
  const wrapperRef = useRef<HTMLDivElement>(null)   // measures available flex space
  const taRef      = useRef<HTMLTextAreaElement>(null)

  const [taValue, setTaValue] = useState('')
  const [taStyle, setTaStyle] = useState<React.CSSProperties>({})

  // ── Measure available space from the flex wrapper ────────────────────────
  // Wrapper has a real flex-determined size. We derive stageWidth from it so
  // the Stage container never has a circular width dependency.
  useEffect(() => {
    const el = wrapperRef.current
    if (!el) return
    const measure = () => {
      const availH = el.clientHeight - 24   // subtract padding (p-3 each side)
      const availW = el.clientWidth  - 24
      if (availH <= 0 || availW <= 0) return
      // Fit 9:16 into available rectangle
      const byHeight = Math.round(availH * (9 / 16))
      const sw = Math.min(byHeight, availW)
      setStageWidth(Math.max(sw, 80))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const scale       = stageWidth > 0 ? stageWidth / CANVAS_W : 1
  const stageHeight = Math.round(CANVAS_H * scale)

  // ── Attach Transformer to selected node ──────────────────────────────────
  useEffect(() => {
    if (!trRef.current || !stageRef.current) return
    if (selectedId && !editingId) {
      const node = stageRef.current.findOne(`#${selectedId}`)
      if (node) trRef.current.nodes([node])
    } else {
      trRef.current.nodes([])
    }
    trRef.current.getLayer()?.batchDraw()
  }, [selectedId, editingId])

  // ── Auto-scaled font sizes (deferred so loading state renders first) ────────
  const fontFamily = FONTS.find(f => f.id === fontId)!.family

  const [computedSizes, setComputedSizes] = useState<Map<string, number>>(new Map())
  const [isComputing, setIsComputing]     = useState(false)

  useEffect(() => {
    setIsComputing(true)
    // requestAnimationFrame lets the loading indicator paint before the heavy work
    const raf = requestAnimationFrame(() => {
      const map = new Map<string, number>()
      for (const el of elements) {
        const override = sizeOverrides.get(el.id)
        if (override !== undefined) { map.set(el.id, override); continue }
        const maxH = el.role === 'main' ? CANVAS_H * 0.60 : CANVAS_H * 0.08
        map.set(el.id, fitFontSize(el.text, fontFamily, el.fontStyle, el.width, maxH, el.fontSize))
      }
      setComputedSizes(map)
      setIsComputing(false)
    })
    return () => cancelAnimationFrame(raf)
  }, [elements, fontFamily, sizeOverrides])

  // ── Helpers ───────────────────────────────────────────────────────────────
  function changeTemplate(t: TemplateDef) {
    setTemplate(t)
    setElements(buildElements(t, text, reference))
    setSelectedId(null)
    setEditingId(null)
    setSizeOverrides(new Map())
  }

  function updateEl(id: string, patch: Partial<ActiveElement>) {
    setElements(es => es.map(e => e.id === id ? { ...e, ...patch } : e))
  }

  // ── Inline text editing via textarea overlay ──────────────────────────────
  function openEdit(id: string) {
    if (!stageRef.current) return
    const node: Konva.Text | undefined = stageRef.current.findOne(`#${id}`)
    const el = elements.find(e => e.id === id)
    if (!node || !el) return

    const box    = (stageRef.current.container() as HTMLElement).getBoundingClientRect()
    const absPos = node.getAbsolutePosition()
    const fs     = (computedSizes.get(id) ?? el.fontSize) * scale

    setTaValue(el.text)
    setTaStyle({
      position:    'fixed',
      left:        box.left + absPos.x * scale,
      top:         box.top  + absPos.y * scale,
      width:       el.width * scale,
      minHeight:   fs * 2,
      fontSize:    fs,
      fontFamily,
      fontStyle:   el.fontStyle.includes('italic') ? 'italic' : 'normal',
      fontWeight:  el.fontStyle.includes('bold')   ? 'bold'   : 'normal',
      color:       el.color,
      textAlign:   el.align,
      lineHeight:  '1.55',
      background:  'rgba(0,0,0,0.72)',
      border:      '1px solid rgba(255,255,255,0.45)',
      borderRadius: '4px',
      padding:     '4px 6px',
      margin:      0,
      resize:      'none',
      outline:     'none',
      zIndex:      300,
      overflow:    'hidden',
    })
    setEditingId(id)
    setSelectedId(null)
    requestAnimationFrame(() => {
      if (!taRef.current) return
      taRef.current.focus()
      taRef.current.style.height = 'auto'
      taRef.current.style.height = `${taRef.current.scrollHeight}px`
    })
  }

  function closeEdit() {
    if (!editingId) return
    updateEl(editingId, { text: taValue })
    setEditingId(null)
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function exportImage(download: boolean) {
    if (!stageRef.current) return null
    const pixelRatio = stageWidth > 0 ? CANVAS_W / stageWidth : 1
    return stageRef.current.toDataURL({ pixelRatio, mimeType: 'image/png' }) as string
  }

  function handleDownload() {
    const dataURL = exportImage(true)
    if (!dataURL) return
    const a = document.createElement('a')
    a.href = dataURL
    a.download = 'mana-historia.png'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  async function handleShare() {
    const dataURL = exportImage(false)
    if (!dataURL) return
    try {
      const blob = await (await fetch(dataURL)).blob()
      const file = new File([blob], 'mana-historia.png', { type: 'image/png' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file] })
        return
      }
    } catch { /* fall through to download */ }
    handleDownload()
  }

  const selectedEl  = elements.find(e => e.id === selectedId) ?? null
  const currentSize = selectedId
    ? (sizeOverrides.get(selectedId) ?? computedSizes.get(selectedId) ?? 48)
    : null

  return (
    <div className="fixed inset-0 z-[90] flex flex-col bg-gray-950 overflow-hidden">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 pt-4 pb-3 shrink-0 border-b border-gray-800">
        <button
          onClick={onClose}
          className="w-10 h-10 flex items-center justify-center rounded-xl text-gray-400
                     hover:bg-gray-800 active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="text-white font-semibold text-sm">Crear historia</h2>
        <button
          onClick={handleDownload}
          title="Descargar imagen"
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-gray-800
                     text-gray-300 hover:bg-gray-700 active:scale-95 transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 3v12" />
          </svg>
        </button>
      </div>

      {/* ── Template selector ─────────────────────────────────────────────── */}
      <div className="shrink-0 px-4 pt-3 pb-2 border-b border-gray-800">
        <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2.5">Plantilla</p>
        <div className="flex gap-3 overflow-x-auto scrollbar-none pb-1">
          {STORY_TEMPLATES.map(t => (
            <div key={t.id} className="flex flex-col items-center gap-1.5 flex-none">
              <TemplateThumbnail
                tpl={t}
                selected={template.id === t.id}
                onClick={() => changeTemplate(t)}
              />
              <span className="text-[9px] text-gray-500 leading-none">{t.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Stage area ────────────────────────────────────────────────────── */}
      <div
        ref={wrapperRef}
        className="flex-1 min-h-0 flex items-center justify-center bg-gray-900 p-3"
      >
        {/* Explicit pixel size — breaks the circular CSS dependency */}
        <div
          className="relative rounded-xl overflow-hidden shadow-2xl ring-1 ring-white/10 flex-none"
          style={{ width: stageWidth, height: stageHeight }}
        >
          {/* Loading overlay */}
          {isComputing && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 rounded-xl">
              <div className="w-8 h-8 rounded-full border-2 border-white/20 border-t-white animate-spin" />
            </div>
          )}
          <Stage
            ref={stageRef}
            width={stageWidth}
            height={stageHeight}
            scaleX={scale}
            scaleY={scale}
            onPointerDown={(e: { target: { getStage: () => unknown } }) => {
              if (e.target === (e.target as Konva.Node).getStage()) {
                if (editingId) closeEdit()
                setSelectedId(null)
              }
            }}
          >
              <Layer>
                {/* Background gradient */}
                <Rect
                  width={CANVAS_W}
                  height={CANVAS_H}
                  fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                  fillLinearGradientEndPoint={{ x: 0, y: CANVAS_H }}
                  fillLinearGradientColorStops={[0, template.bg, 1, template.bg2]}
                />

                {/* Text elements */}
                {elements.map(el => (
                  <Text
                    key={el.id}
                    id={el.id}
                    text={editingId === el.id ? '' : el.text}
                    x={el.x}
                    y={el.y}
                    width={el.width}
                    fontSize={computedSizes.get(el.id) ?? el.fontSize}
                    fontFamily={fontFamily}
                    fontStyle={el.fontStyle}
                    fill={el.color}
                    align={el.align}
                    lineHeight={1.55}
                    wrap="word"
                    draggable
                    onDragEnd={(e: Konva.KonvaEventObject<DragEvent>) => {
                      updateEl(el.id, { x: e.target.x(), y: e.target.y() })
                    }}
                    onClick={() => setSelectedId(el.id)}
                    onTap={() => setSelectedId(el.id)}
                    onDblClick={() => openEdit(el.id)}
                    onDblTap={() => openEdit(el.id)}
                    onTransformEnd={(e: Konva.KonvaEventObject<Event>) => {
                      const node = e.target as Konva.Text
                      const newWidth = Math.max(200, el.width * node.scaleX())
                      updateEl(el.id, { x: node.x(), y: node.y(), width: newWidth })
                      node.scaleX(1)
                      node.scaleY(1)
                    }}
                  />
                ))}

                {/* Subtle watermark */}
                <Text
                  text={typeof window !== 'undefined' ? window.location.hostname : 'app-mana.vercel.app'}
                  x={0}
                  y={CANVAS_H - 56}
                  width={CANVAS_W}
                  align="center"
                  fontSize={24}
                  fontFamily={fontFamily}
                  fill="rgba(255,255,255,0.22)"
                  listening={false}
                />

                {/* Transformer */}
                <Transformer
                  ref={trRef}
                  rotateEnabled={false}
                  enabledAnchors={['middle-left', 'middle-right']}
                  boundBoxFunc={(_oldBox, newBox) => ({
                    ...newBox,
                    width: Math.max(200, newBox.width),
                  })}
                  anchorSize={20}
                  anchorCornerRadius={5}
                  anchorStroke="rgba(255,255,255,0.9)"
                  anchorFill="white"
                  borderStroke="rgba(255,255,255,0.4)"
                  borderDash={[6, 3]}
                  padding={8}
                />
              </Layer>
            </Stage>
        </div>
      </div>

      {/* ── Controls ──────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-gray-950 border-t border-gray-800 px-4 pt-3 pb-5 space-y-3">

        {/* Font picker */}
        <div>
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Fuente</p>
          <div className="flex gap-2">
            {FONTS.map(f => (
              <button
                key={f.id}
                onClick={() => setFontId(f.id)}
                className={[
                  'flex-1 py-2 rounded-xl text-xs font-medium transition-all duration-150',
                  fontId === f.id
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 active:scale-95',
                ].join(' ')}
                style={{ fontFamily: f.family }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Size + Align (shown when element selected) */}
        {selectedEl && currentSize !== null ? (
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                Tamaño — <span className="text-gray-300">{Math.round(currentSize)}</span>
              </p>
              <input
                type="range"
                min={22}
                max={120}
                step={1}
                value={currentSize}
                onChange={e => {
                  const v = Number(e.target.value)
                  setSizeOverrides(m => new Map(m).set(selectedId!, v))
                }}
                className="w-full h-1.5 rounded-full bg-gray-700 accent-white cursor-pointer"
              />
            </div>
            <div>
              <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2">Alin.</p>
              <div className="flex gap-1">
                {(
                  [
                    ['left',   '⇐'],
                    ['center', '⇔'],
                    ['right',  '⇒'],
                  ] as [ActiveElement['align'], string][]
                ).map(([a, icon]) => (
                  <button
                    key={a}
                    onClick={() => updateEl(selectedId!, { align: a })}
                    className={[
                      'w-9 h-9 rounded-lg text-sm transition-all',
                      selectedEl.align === a
                        ? 'bg-white text-gray-900'
                        : 'bg-gray-800 text-gray-400 hover:bg-gray-700',
                    ].join(' ')}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600 text-center py-0.5">
            Toca el texto para seleccionar · Doble toque para editar
          </p>
        )}

        {/* Share button */}
        <button
          onClick={handleShare}
          className="w-full py-3.5 rounded-2xl bg-dorado text-crema-50 font-semibold text-sm
                     flex items-center justify-center gap-2 active:scale-[0.98] transition-all duration-150"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
            />
          </svg>
          Compartir historia
        </button>
      </div>

      {/* ── Textarea overlay (inline text editing) ────────────────────────── */}
      {editingId && (
        <textarea
          ref={taRef}
          value={taValue}
          rows={1}
          onChange={e => {
            setTaValue(e.target.value)
            e.currentTarget.style.height = 'auto'
            e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
          }}
          onBlur={closeEdit}
          onKeyDown={e => {
            if (e.key === 'Escape') closeEdit()
          }}
          style={taStyle}
        />
      )}
    </div>
  )
}
