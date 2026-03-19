// ── Share Card Generator ──────────────────────────────────────────────────────
// Creates a styled canvas image of the day's Gospel reading for sharing.
// Uses the Web Share API with file sharing on mobile, or canvas download fallback.

export interface ShareCardData {
  celebrationName: string
  liturgicalLabel: string
  dateStr: string        // e.g. "Jueves, 19 de marzo de 2026"
  gospelRef: string      // e.g. "Mt 1:16.18-21.24a"
  gospelText: string     // First verse(s) of the gospel
  color: string          // liturgical color: 'violet' | 'white' | 'red' | 'green'
}

const COLORS: Record<string, { bg: string; accent: string; text: string; sub: string }> = {
  violet: { bg: '#3B1F5E', accent: '#A78BFA', text: '#EDE9FE', sub: '#C4B5FD' },
  white:  { bg: '#78450A', accent: '#FCD34D', text: '#FFFBEB', sub: '#FDE68A' },
  red:    { bg: '#7F1D1D', accent: '#FCA5A5', text: '#FEF2F2', sub: '#FECACA' },
  green:  { bg: '#1A3A1A', accent: '#86EFAC', text: '#F0FDF4', sub: '#BBF7D0' },
  black:  { bg: '#1C1917', accent: '#D6D3D1', text: '#F5F5F4', sub: '#A8A29E' },
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
): number {
  const words = text.split(' ')
  let line = ''
  let currentY = y

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, currentY)
      line = word
      currentY += lineHeight
    } else {
      line = testLine
    }
  }
  if (line) ctx.fillText(line, x, currentY)
  return currentY + lineHeight
}

export async function generateShareCard(data: ShareCardData): Promise<Blob | null> {
  const W = 1080
  const H = 1080
  const PADDING = 72

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  const palette = COLORS[data.color] ?? COLORS.violet

  // ── Background ──────────────────────────────────────────────────────────────
  ctx.fillStyle = palette.bg
  ctx.fillRect(0, 0, W, H)

  // Subtle radial vignette overlay
  const grad = ctx.createRadialGradient(W / 2, H / 2, 200, W / 2, H / 2, 700)
  grad.addColorStop(0, 'rgba(255,255,255,0.04)')
  grad.addColorStop(1, 'rgba(0,0,0,0.30)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  // ── Top divider ─────────────────────────────────────────────────────────────
  ctx.fillStyle = palette.accent
  ctx.fillRect(PADDING, 68, W - PADDING * 2, 3)

  // ── App name ─────────────────────────────────────────────────────────────────
  ctx.fillStyle = palette.accent
  ctx.font = `600 28px -apple-system, "Helvetica Neue", Arial, sans-serif`
  ctx.letterSpacing = '4px'
  ctx.fillText('MANÁ', PADDING, 58)
  ctx.letterSpacing = '0px'

  // ── Liturgical label (small) ─────────────────────────────────────────────────
  ctx.fillStyle = palette.sub
  ctx.font = `400 30px -apple-system, "Helvetica Neue", Arial, sans-serif`
  ctx.fillText(data.liturgicalLabel.toUpperCase(), PADDING, 130)

  // ── Celebration name (main title) ────────────────────────────────────────────
  ctx.fillStyle = palette.text
  ctx.font = `700 64px Georgia, "Times New Roman", serif`
  const celebrationLines = splitIntoLines(ctx, data.celebrationName, W - PADDING * 2, 64)
  let y = 200
  for (const line of celebrationLines) {
    ctx.fillText(line, PADDING, y)
    y += 76
  }

  // ── Date ─────────────────────────────────────────────────────────────────────
  ctx.fillStyle = palette.sub
  ctx.font = `400 32px -apple-system, "Helvetica Neue", Arial, sans-serif`
  ctx.fillText(data.dateStr, PADDING, y + 16)
  y += 70

  // ── Divider ──────────────────────────────────────────────────────────────────
  ctx.fillStyle = palette.accent + '60'  // semi-transparent
  ctx.fillRect(PADDING, y, W - PADDING * 2, 1)
  y += 48

  // ── "Evangelio" label ────────────────────────────────────────────────────────
  ctx.fillStyle = palette.accent
  ctx.font = `600 26px -apple-system, "Helvetica Neue", Arial, sans-serif`
  ctx.letterSpacing = '3px'
  ctx.fillText('EVANGELIO', PADDING, y)
  ctx.letterSpacing = '0px'
  y += 40

  // ── Gospel reference ─────────────────────────────────────────────────────────
  ctx.fillStyle = palette.text
  ctx.font = `600 38px Georgia, "Times New Roman", serif`
  ctx.fillText(data.gospelRef, PADDING, y)
  y += 60

  // ── Gospel text (excerpt) ─────────────────────────────────────────────────────
  if (data.gospelText) {
    // Trim text to a reasonable length
    const maxChars = 320
    const excerpt = data.gospelText.length > maxChars
      ? data.gospelText.slice(0, maxChars).trim() + '…'
      : data.gospelText

    ctx.fillStyle = palette.text + 'CC'  // slightly transparent
    ctx.font = `400 34px Georgia, "Times New Roman", serif`
    wrapText(ctx, `"${excerpt}"`, PADDING, y, W - PADDING * 2, 50)
  }

  // ── Bottom cross decoration ───────────────────────────────────────────────────
  ctx.fillStyle = palette.accent
  drawCross(ctx, W / 2, H - 100, 28)

  // ── Bottom divider ───────────────────────────────────────────────────────────
  ctx.fillStyle = palette.accent
  ctx.fillRect(PADDING, H - 68, W - PADDING * 2, 3)

  // ── Footer ────────────────────────────────────────────────────────────────────
  ctx.fillStyle = palette.sub
  ctx.font = `400 24px -apple-system, "Helvetica Neue", Arial, sans-serif`
  ctx.letterSpacing = '1px'
  ctx.textAlign = 'center'
  ctx.fillText('Lecturas del día · Maná', W / 2, H - 28)
  ctx.letterSpacing = '0px'
  ctx.textAlign = 'left'

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

function splitIntoLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  _fontSize: number,
): string[] {
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

function drawCross(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number) {
  const arm = size
  const thickness = size * 0.18
  ctx.beginPath()
  ctx.roundRect(cx - thickness / 2, cy - arm, thickness, arm * 2, thickness / 2)
  ctx.fill()
  ctx.beginPath()
  ctx.roundRect(cx - arm * 0.65, cy - thickness / 2 - arm * 0.2, arm * 1.3, thickness, thickness / 2)
  ctx.fill()
}

// ── Share or download ─────────────────────────────────────────────────────────

export async function shareOrDownload(
  data: ShareCardData,
  filename = 'lecturas-del-dia.png',
): Promise<void> {
  const blob = await generateShareCard(data)
  if (!blob) return

  const file = new File([blob], filename, { type: 'image/png' })

  // Try Web Share API with files (mobile)
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title: `Lecturas del día — ${data.celebrationName}`,
      text: `${data.celebrationName} · ${data.gospelRef}`,
    })
    return
  }

  // Fallback: download the image
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
