// ── Verse Image Generator ─────────────────────────────────────────────────────
// Flexible canvas-based image generator for Bible verses and Gospel sharing.
// All rendering happens client-side. Output: 1080x1920 PNG (9:16 Stories format).

// ── Color utilities ───────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)]
}
function rgba(hex: string, a: number): string {
  const [r,g,b] = hexToRgb(hex)
  return `rgba(${r},${g},${b},${a})`
}
function darken(hex: string, f: number): string {
  const [r,g,b] = hexToRgb(hex)
  return `rgb(${Math.round(r*(1-f))},${Math.round(g*(1-f))},${Math.round(b*(1-f))})`
}
function lighten(hex: string, f: number): string {
  const [r,g,b] = hexToRgb(hex)
  return `rgb(${Math.min(255,Math.round(r+(255-r)*f))},${Math.min(255,Math.round(g+(255-g)*f))},${Math.min(255,Math.round(b+(255-b)*f))})`
}
function isBgLight(hex: string): boolean {
  const [r,g,b] = hexToRgb(hex)
  return (r*0.299 + g*0.587 + b*0.114) > 128
}

// ── Themes ────────────────────────────────────────────────────────────────────
export interface ImageTheme {
  id: string
  name: string
  bg: string
  bg2?: string   // gradient target color
  accent: string
  text: string
  sub: string
}

export const IMAGE_THEMES: ImageTheme[] = [
  // Dark themes
  { id: 'noche',     name: 'Noche',      bg: '#1E1035', bg2: '#080618', accent: '#A78BFA', text: '#EDE9FE', sub: '#C4B5FD' },
  { id: 'mar',       name: 'Mar',        bg: '#0C2340', bg2: '#040D1A', accent: '#93C5FD', text: '#EFF6FF', sub: '#BFDBFE' },
  { id: 'bosque',    name: 'Bosque',     bg: '#1A3A1A', bg2: '#071307', accent: '#86EFAC', text: '#F0FDF4', sub: '#BBF7D0' },
  { id: 'cielo',     name: 'Cielo',      bg: '#1E3A5F', bg2: '#091828', accent: '#FCD34D', text: '#FFFBEB', sub: '#FDE68A' },
  { id: 'alba',      name: 'Alba',       bg: '#7C2D12', bg2: '#2E0B02', accent: '#FCA5A5', text: '#FFF1F2', sub: '#FECDD3' },
  { id: 'dorado',    name: 'Dorado',     bg: '#78450A', bg2: '#2E1600', accent: '#FCD34D', text: '#FFFBEB', sub: '#FDE68A' },
  { id: 'pergamino', name: 'Pergamino',  bg: '#3D2B1F', bg2: '#150E08', accent: '#D4A96A', text: '#F5E6CE', sub: '#E8C99A' },
  // Rich gradient themes
  { id: 'aurora',    name: 'Aurora',     bg: '#12002E', bg2: '#001635', accent: '#E879F9', text: '#FAF5FF', sub: '#D8B4FE' },
  { id: 'rosa',      name: 'Rosa',       bg: '#45001E', bg2: '#1A0012', accent: '#F472B6', text: '#FFF0F3', sub: '#FBCFE8' },
  { id: 'tierra',    name: 'Tierra',     bg: '#2E1A0C', bg2: '#110804', accent: '#F59E0B', text: '#FFFBEB', sub: '#FDE68A' },
  { id: 'plata',     name: 'Plata',      bg: '#1A1A2E', bg2: '#080812', accent: '#94A3B8', text: '#F1F5F9', sub: '#CBD5E1' },
  // Light theme
  { id: 'marmol',    name: 'Mármol',     bg: '#F0EBE0', bg2: '#CFC6B4', accent: '#8B6914', text: '#2C1810', sub: '#5C3D25' },
]

export const LITURGICAL_THEME_MAP: Record<string, string> = {
  violet: 'noche',
  white:  'dorado',
  red:    'alba',
  green:  'bosque',
  black:  'plata',
  rose:   'rosa',
}

// ── Config ────────────────────────────────────────────────────────────────────
export interface ImageConfig {
  headerLabel: string
  verseRef: string
  verses: { number: number; text: string }[]
  footer?: string

  theme: ImageTheme
  fontSize: 'small' | 'medium' | 'large'
  textAlign: 'left' | 'center'

  // Background
  bgEffect: 'solid' | 'gradient-v' | 'gradient-radial' | 'light-leak' | 'bokeh'
  showVignette: boolean

  // Decorative elements
  ornament: 'none' | 'cross' | 'ichthys' | 'alpha-omega' | 'stars'
  frameStyle: 'none' | 'line' | 'double' | 'ornate'

  // Text
  textEffect: 'normal' | 'shadow' | 'outline'
  showQuotes: boolean
}

// ── Fixed bokeh positions [xFrac, yFrac, rFrac, opacity] ─────────────────────
const BOKEH: [number, number, number, number][] = [
  [0.12, 0.09, 0.14, 0.28], [0.82, 0.06, 0.11, 0.22], [0.48, 0.16, 0.09, 0.18],
  [0.94, 0.30, 0.13, 0.20], [0.05, 0.50, 0.10, 0.16], [0.72, 0.55, 0.15, 0.24],
  [0.26, 0.73, 0.11, 0.18], [0.90, 0.78, 0.08, 0.15], [0.54, 0.87, 0.12, 0.20],
  [0.16, 0.92, 0.07, 0.14], [0.65, 0.04, 0.09, 0.16], [0.38, 0.44, 0.06, 0.12],
]

// ── Canvas drawing helpers ────────────────────────────────────────────────────
function wrapWords(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let current = ''
  for (const word of words) {
    const test = current ? current + ' ' + word : word
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current)
      current = word
    } else {
      current = test
    }
  }
  if (current) lines.push(current)
  return lines
}

function drawStar5(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath()
  for (let i = 0; i < 10; i++) {
    const radius = i % 2 === 0 ? r : r * 0.42
    const angle = (i * Math.PI / 5) - Math.PI / 2
    const x = cx + radius * Math.cos(angle)
    const y = cy + radius * Math.sin(angle)
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}

function drawCross(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number) {
  const t = sz * 0.20
  ctx.beginPath()
  ctx.roundRect(cx - t/2, cy - sz, t, sz * 2.2, t/2)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(cx - sz*0.72, cy - t/2 - sz*0.18, sz*1.44, t, t/2)
  ctx.fill()
}

function drawIchthys(ctx: CanvasRenderingContext2D, cx: number, cy: number, sz: number) {
  ctx.lineWidth = sz * 0.08
  ctx.beginPath()
  ctx.moveTo(cx - sz, cy)
  ctx.bezierCurveTo(cx - sz*0.3, cy - sz*0.58, cx + sz*0.35, cy - sz*0.58, cx + sz, cy)
  ctx.bezierCurveTo(cx + sz*0.35, cy + sz*0.58, cx - sz*0.3, cy + sz*0.58, cx - sz, cy)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx + sz*0.62, cy - sz*0.30)
  ctx.lineTo(cx + sz*1.28, cy - sz*0.52)
  ctx.moveTo(cx + sz*0.62, cy + sz*0.30)
  ctx.lineTo(cx + sz*1.28, cy + sz*0.52)
  ctx.stroke()
}

function drawOrnateFrame(ctx: CanvasRenderingContext2D, W: number, H: number, color: string, alpha: number) {
  const m = W * 0.040
  const arm = W * 0.078
  const t = W * 0.0026

  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.globalAlpha = alpha

  // Outer rectangle
  ctx.lineWidth = t
  ctx.strokeRect(m, m, W - m*2, H - m*2)
  // Inner thin line
  const m2 = m + W * 0.016
  ctx.lineWidth = t * 0.45
  ctx.globalAlpha = alpha * 0.45
  ctx.strokeRect(m2, m2, W - m2*2, H - m2*2)
  ctx.globalAlpha = alpha

  // Corner flourishes: L-bracket + diamond + end dots
  for (const [bx, by, sx, sy] of [
    [m, m, 1, 1], [W-m, m, -1, 1], [m, H-m, 1, -1], [W-m, H-m, -1, -1],
  ] as [number, number, number, number][]) {
    ctx.lineWidth = t * 1.3
    ctx.beginPath()
    ctx.moveTo(bx + sx * arm, by)
    ctx.lineTo(bx, by)
    ctx.lineTo(bx, by + sy * arm)
    ctx.stroke()

    // Diamond at corner
    const d = W * 0.010
    ctx.beginPath()
    ctx.moveTo(bx, by - sy*d)
    ctx.lineTo(bx + sx*d, by)
    ctx.lineTo(bx, by + sy*d)
    ctx.lineTo(bx - sx*d, by)
    ctx.closePath()
    ctx.fill()

    // End dots on each arm
    const dr = W * 0.0044
    ctx.beginPath(); ctx.arc(bx + sx*arm, by, dr, 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(bx, by + sy*arm, dr, 0, Math.PI*2); ctx.fill()
    // Mid-arm dots
    const dr2 = dr * 0.6
    ctx.beginPath(); ctx.arc(bx + sx*arm*0.5, by, dr2, 0, Math.PI*2); ctx.fill()
    ctx.beginPath(); ctx.arc(bx, by + sy*arm*0.5, dr2, 0, Math.PI*2); ctx.fill()
  }
  ctx.globalAlpha = 1
}

// ── Main render ───────────────────────────────────────────────────────────────
export function renderToCanvas(canvas: HTMLCanvasElement, config: ImageConfig): void {
  const W = canvas.width
  const H = canvas.height
  const P = Math.round(W * 0.074)
  const ctx = canvas.getContext('2d')
  if (!ctx) return

  const { theme } = config
  const isCentered = config.textAlign === 'center'
  const xBase = isCentered ? W / 2 : P
  const isLight = isBgLight(theme.bg)

  // ── 1. Background ──────────────────────────────────────────────────────────
  if (config.bgEffect === 'gradient-v') {
    const g = ctx.createLinearGradient(0, 0, 0, H)
    g.addColorStop(0, theme.bg)
    g.addColorStop(1, theme.bg2 ?? darken(theme.bg, 0.50))
    ctx.fillStyle = g
  } else if (config.bgEffect === 'gradient-radial') {
    const g = ctx.createRadialGradient(W*0.5, H*0.36, 0, W*0.5, H*0.36, W*0.98)
    g.addColorStop(0, lighten(theme.bg, 0.20))
    g.addColorStop(0.45, theme.bg)
    g.addColorStop(1, theme.bg2 ?? darken(theme.bg, 0.40))
    ctx.fillStyle = g
  } else {
    ctx.fillStyle = theme.bg
  }
  ctx.fillRect(0, 0, W, H)

  // Bokeh circles
  if (config.bgEffect === 'bokeh') {
    for (const [xf, yf, rf, op] of BOKEH) {
      const bx = W*xf, by = H*yf, br = W*rf
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, br)
      g.addColorStop(0, rgba(theme.accent, op))
      g.addColorStop(1, rgba(theme.accent, 0))
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
    }
  }

  // Light leak — warm glow from corner
  if (config.bgEffect === 'light-leak') {
    const l1 = ctx.createRadialGradient(W*0.07, H*0.06, 0, W*0.07, H*0.06, W*0.78)
    l1.addColorStop(0, rgba(theme.accent, 0.30))
    l1.addColorStop(0.35, rgba(theme.accent, 0.10))
    l1.addColorStop(1, rgba(theme.accent, 0))
    ctx.fillStyle = l1
    ctx.fillRect(0, 0, W, H)
    const l2 = ctx.createRadialGradient(W*0.93, H*0.88, 0, W*0.93, H*0.88, W*0.55)
    l2.addColorStop(0, rgba(theme.accent, 0.14))
    l2.addColorStop(1, rgba(theme.accent, 0))
    ctx.fillStyle = l2
    ctx.fillRect(0, 0, W, H)
  }

  // ── 2. Vignette ────────────────────────────────────────────────────────────
  if (config.showVignette) {
    const v = ctx.createRadialGradient(W/2, H/2, W*0.16, W/2, H/2, W*0.96)
    v.addColorStop(0, 'rgba(255,255,255,0.03)')
    v.addColorStop(0.55, 'rgba(0,0,0,0.04)')
    v.addColorStop(1, isLight ? 'rgba(0,0,0,0.22)' : 'rgba(0,0,0,0.52)')
    ctx.fillStyle = v
    ctx.fillRect(0, 0, W, H)
  }

  // ── 3. Frame ───────────────────────────────────────────────────────────────
  const fa = isLight ? 0.55 : 0.38
  if (config.frameStyle === 'line') {
    const m = W * 0.042
    ctx.strokeStyle = theme.accent
    ctx.globalAlpha = fa
    ctx.lineWidth = W * 0.0028
    ctx.strokeRect(m, m, W-m*2, H-m*2)
    ctx.globalAlpha = 1
  } else if (config.frameStyle === 'double') {
    const m1 = W*0.036, m2 = m1 + W*0.024
    ctx.strokeStyle = theme.accent
    ctx.globalAlpha = fa
    ctx.lineWidth = W * 0.0028; ctx.strokeRect(m1, m1, W-m1*2, H-m1*2)
    ctx.lineWidth = W * 0.0013; ctx.strokeRect(m2, m2, W-m2*2, H-m2*2)
    ctx.globalAlpha = 1
  } else if (config.frameStyle === 'ornate') {
    drawOrnateFrame(ctx, W, H, theme.accent, fa * 1.15)
  }

  // ── 4. Bottom ornament ─────────────────────────────────────────────────────
  if (config.ornament !== 'none') {
    const ox = W / 2, oy = H * 0.875, osz = W * 0.055
    ctx.fillStyle = theme.accent
    ctx.strokeStyle = theme.accent
    ctx.globalAlpha = 0.22

    if (config.ornament === 'cross') {
      drawCross(ctx, ox, oy, osz * 1.1)

    } else if (config.ornament === 'ichthys') {
      drawIchthys(ctx, ox, oy, osz * 1.1)

    } else if (config.ornament === 'alpha-omega') {
      const aosz = Math.round(W * 0.068)
      ctx.font = `italic 700 ${aosz}px Georgia, "Times New Roman", serif`
      ctx.textAlign = 'center'
      ctx.fillText('α  ω', ox, oy + aosz * 0.38)

    } else if (config.ornament === 'stars') {
      const pts: [number, number, number][] = [
        [0.50, 0.875, 1.10], [0.38, 0.868, 0.65], [0.62, 0.868, 0.65],
        [0.27, 0.879, 0.48], [0.73, 0.879, 0.48],
        [0.14, 0.092, 0.50], [0.86, 0.092, 0.50],
        [0.07, 0.260, 0.36], [0.93, 0.260, 0.36],
        [0.08, 0.790, 0.36], [0.92, 0.790, 0.36],
        [0.50, 0.052, 0.42],
      ]
      for (const [xf, yf, rf] of pts) drawStar5(ctx, W*xf, H*yf, osz*rf)
    }
    ctx.globalAlpha = 1
  }

  // ── 5. Header label ────────────────────────────────────────────────────────
  let y = Math.round(H * 0.062)

  // Helper: apply/clear text shadow
  const setShadow = (on: boolean) => {
    if (on && config.textEffect === 'shadow') {
      ctx.shadowColor = 'rgba(0,0,0,0.65)'
      ctx.shadowBlur = W * 0.012
      ctx.shadowOffsetX = W * 0.003
      ctx.shadowOffsetY = W * 0.003
    } else {
      ctx.shadowColor = 'transparent'
      ctx.shadowBlur = 0
      ctx.shadowOffsetX = 0
      ctx.shadowOffsetY = 0
    }
  }
  const drawText = (text: string, x: number, fy: number, fillColor: string) => {
    ctx.fillStyle = fillColor
    if (config.textEffect === 'outline') {
      ctx.strokeStyle = isLight ? rgba(theme.bg, 0.5) : rgba(theme.bg, 0.85)
      ctx.lineWidth = W * 0.0028
      ctx.strokeText(text, x, fy)
    }
    ctx.fillText(text, x, fy)
  }

  setShadow(true)
  const headerSize = Math.round(W * 0.044)
  ctx.font = `700 ${headerSize}px Garamond, Georgia, "Times New Roman", serif`
  ctx.letterSpacing = '4px'
  ctx.textAlign = isCentered ? 'center' : 'left'
  drawText(config.headerLabel, xBase, y, theme.accent)
  ctx.letterSpacing = '0px'
  y += Math.round(H * 0.042)

  // ── 6. Verse reference ─────────────────────────────────────────────────────
  const refSize = Math.round(W * 0.038)
  ctx.font = `600 ${refSize}px Garamond, Georgia, "Times New Roman", serif`
  ctx.textAlign = isCentered ? 'center' : 'left'
  drawText(config.verseRef, xBase, y, theme.text)
  y += Math.round(H * 0.030)

  // ── 7. Divider ─────────────────────────────────────────────────────────────
  setShadow(false)
  ctx.strokeStyle = theme.accent
  ctx.globalAlpha = 0.50
  ctx.lineWidth = W * 0.002
  if (isCentered) {
    const lw = W * 0.22
    ctx.beginPath(); ctx.moveTo(W/2-lw/2, y); ctx.lineTo(W/2+lw/2, y); ctx.stroke()
    // Small diamond on divider center
    ctx.fillStyle = theme.accent
    const dd = W * 0.006
    ctx.beginPath()
    ctx.moveTo(W/2, y-dd); ctx.lineTo(W/2+dd, y); ctx.lineTo(W/2, y+dd); ctx.lineTo(W/2-dd, y)
    ctx.closePath(); ctx.fill()
  } else {
    ctx.beginPath(); ctx.moveTo(P, y); ctx.lineTo(P + W*0.18, y); ctx.stroke()
  }
  ctx.globalAlpha = 1
  y += Math.round(H * 0.034)

  // ── 8. Verse layout (compute before drawing quotes) ────────────────────────
  const maxWidth = W - P * 2
  const footerReserve = Math.round(H * 0.082)
  const availH = H - y - footerReserve
  const BASE_FS: Record<ImageConfig['fontSize'], number> = { small: 38, medium: 48, large: 60 }

  const fullText = config.verses.map(v => `{{${v.number}}} ${v.text}`).join(' ')
  let fontSize = Math.round(W * (BASE_FS[config.fontSize] / 1080))
  const minFontSize = Math.round(W * (16 / 1080))

  const calcH = (size: number): number => {
    ctx.font = `400 ${size}px Garamond, Georgia, "Times New Roman", serif`
    return wrapWords(ctx, fullText, maxWidth).length * (size * 1.65)
  }
  while (fontSize > minFontSize && calcH(fontSize) > availH) fontSize -= 1

  const lineH = fontSize * 1.65
  ctx.font = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
  const allLines = wrapWords(ctx, fullText, maxWidth)
  const verseNumSize = Math.round(fontSize * 0.62)
  const verseStartY = y

  // ── 9. Decorative quotes (behind text) ─────────────────────────────────────
  if (config.showQuotes && allLines.length > 0) {
    const qs = Math.round(fontSize * 5.8)
    ctx.font = `italic bold ${qs}px Georgia, "Times New Roman", serif`
    ctx.fillStyle = theme.accent
    ctx.globalAlpha = isLight ? 0.12 : 0.11
    ctx.textAlign = 'left'
    ctx.fillText('\u201C', P - qs * 0.10, verseStartY + qs * 0.60)
    const textBlockH = allLines.length * lineH
    ctx.textAlign = 'right'
    ctx.fillText('\u201D', W - P + qs * 0.10, verseStartY + textBlockH + qs * 0.08)
    ctx.globalAlpha = 1
  }

  // ── 10. Verse text ─────────────────────────────────────────────────────────
  setShadow(true)

  for (let i = 0; i < allLines.length; i++) {
    const line = allLines[i]
    const isLastLine = i === allLines.length - 1
    const words = line.split(' ')

    if (isCentered) {
      let visible = ''
      for (const w of words) {
        const vm = w.match(/^\{\{(\d+)\}\}$/)
        visible += vm ? `${vm[1]} ` : `${w} `
      }
      ctx.font = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
      ctx.textAlign = 'center'
      drawText(visible.trim(), W/2, y, theme.text)
    } else {
      // Justified left
      ctx.font = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
      let totalWordW = 0
      for (const w of words) {
        const vm = w.match(/^\{\{(\d+)\}\}$/)
        if (vm) {
          ctx.font = `700 ${verseNumSize}px Garamond, Georgia, "Times New Roman", serif`
          totalWordW += ctx.measureText(vm[1]).width + W*0.004
          ctx.font = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
        } else {
          totalWordW += ctx.measureText(w).width
        }
      }
      const spaceW = (isLastLine || words.length === 1)
        ? ctx.measureText(' ').width
        : (maxWidth - totalWordW) / (words.length - 1)

      let xPos = P
      for (let wi = 0; wi < words.length; wi++) {
        const w = words[wi]
        const vm = w.match(/^\{\{(\d+)\}\}$/)
        if (vm) {
          ctx.font = `700 ${verseNumSize}px Garamond, Georgia, "Times New Roman", serif`
          ctx.textAlign = 'left'
          drawText(vm[1], xPos, y - fontSize*0.24, theme.accent)
          xPos += ctx.measureText(vm[1]).width + W*0.004
          ctx.font = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
        } else {
          ctx.textAlign = 'left'
          drawText(w, xPos, y, theme.text)
          xPos += ctx.measureText(w).width + (wi < words.length-1 ? spaceW : 0)
        }
      }
    }
    y += lineH
  }
  setShadow(false)

  // ── 11. Footer ─────────────────────────────────────────────────────────────
  ctx.fillStyle = theme.sub
  ctx.font = `400 ${Math.round(W*0.030)}px Garamond, Georgia, "Times New Roman", serif`
  ctx.textAlign = 'center'
  if (config.footer) ctx.fillText(config.footer, W/2, H - Math.round(H*0.046))

  // ── 12. URL watermark ──────────────────────────────────────────────────────
  ctx.font = `400 ${Math.round(W*0.018)}px Garamond, Georgia, "Times New Roman", serif`
  ctx.globalAlpha = 0.48
  const siteUrl = typeof window !== 'undefined' ? window.location.hostname : 'app-mana.vercel.app'
  ctx.fillText(siteUrl, W/2, H - Math.round(H*0.018))
  ctx.globalAlpha = 1
  ctx.textAlign = 'left'
}

// ── Export helpers ────────────────────────────────────────────────────────────
export async function generateImage(config: ImageConfig): Promise<Blob | null> {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  renderToCanvas(canvas, config)
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

export async function shareImage(config: ImageConfig, filename: string): Promise<void> {
  const blob = await generateImage(config)
  if (!blob) return
  const file = new File([blob], filename, { type: 'image/png' })
  if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file] }); return }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}

export async function downloadImage(config: ImageConfig, filename: string): Promise<void> {
  const blob = await generateImage(config)
  if (!blob) return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
}
