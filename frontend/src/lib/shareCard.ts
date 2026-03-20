// ── Share Card Generator ──────────────────────────────────────────────────────
// Creates a styled canvas image of the day's Gospel reading for sharing.
// Uses the Web Share API with file sharing on mobile, or canvas download fallback.

export interface ShareCardData {
  celebrationName: string
  liturgicalLabel: string
  dateStr: string        // e.g. "Jueves, 19 de marzo de 2026"
  gospelRef: string      // e.g. "Mt 1:16.18-21.24a"
  gospelVerses: Array<{ number: number; text: string }>  // Gospel verses with numbers
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

/**
 * Checks if the gospel text fits in the image canvas.
 * Returns true if it fits, false if it's too long.
 */
export function canGospelFitInImage(verses: Array<{ number: number; text: string }>): boolean {
  if (!verses || verses.length === 0) return true

  // Create temporary canvas to measure text
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return true

  const W = 1080
  const H = 1920
  const PADDING = 80
  const maxWidth = W - PADDING * 2
  
  // Calculate available height (after title, reference, and footer)
  const startY = 120 + 80 + 100  // Title + spacing
  const availableHeight = H - startY - PADDING - 120

  // Build text with verse numbers
  const fullText = verses.map(v => `{{${v.number}}} ${v.text}`).join(' ')

  // Minimum font size is 16px
  const minFontSize = 16
  const lineHeight = minFontSize * 1.6

  // Calculate text height at minimum font size
  ctx.font = `400 ${minFontSize}px Garamond, Georgia, "Times New Roman", serif`
  const words = fullText.split(' ')
  let line = ''
  let lines = 0

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word
    if (ctx.measureText(testLine).width > maxWidth && line) {
      lines++
      line = word
    } else {
      line = testLine
    }
  }
  if (line) lines++

  const textHeight = lines * lineHeight
  return textHeight <= availableHeight
}

export async function generateShareCard(data: ShareCardData): Promise<Blob | null> {
  // Formato 9:16 para Stories de Instagram/WhatsApp
  const W = 1080
  const H = 1920
  const PADDING = 80

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
  const grad = ctx.createRadialGradient(W / 2, H / 2, 300, W / 2, H / 2, 1000)
  grad.addColorStop(0, 'rgba(255,255,255,0.04)')
  grad.addColorStop(1, 'rgba(0,0,0,0.30)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H)

  let y = 120

  // ── "EVANGELIO" título ────────────────────────────────────────────────────────
  ctx.fillStyle = palette.accent
  ctx.font = `700 48px Garamond, Georgia, "Times New Roman", serif`
  ctx.letterSpacing = '4px'
  ctx.textAlign = 'left'
  ctx.fillText('EVANGELIO', PADDING, y)
  ctx.letterSpacing = '0px'
  y += 80

  // ── Cita del Evangelio ─────────────────────────────────────────────────────────
  ctx.fillStyle = palette.text
  ctx.font = `600 44px Garamond, Georgia, "Times New Roman", serif`
  ctx.textAlign = 'left'
  ctx.fillText(data.gospelRef, PADDING, y)
  y += 100

  // ── Texto completo del Evangelio ─────────────────────────────────────────────────
  if (data.gospelVerses && data.gospelVerses.length > 0) {
    const maxWidth = W - PADDING * 2
    const availableHeight = H - y - PADDING - 120  // Espacio para la fecha al final
    
    // Intentar con tamaño máximo de 56px, reducir si no cabe
    let fontSize = 56
    let lineHeight = fontSize * 1.6
    let textFits = false
    
    // Construir el texto completo con números de versículo integrados
    const buildTextWithVerseNumbers = (): string => {
      return data.gospelVerses.map(v => `{{${v.number}}} ${v.text}`).join(' ')
    }

    const fullText = buildTextWithVerseNumbers()

    // Función para calcular altura necesaria
    const calculateTextHeight = (size: number): number => {
      const lh = size * 1.6
      ctx.font = `400 ${size}px Garamond, Georgia, "Times New Roman", serif`
      const words = fullText.split(' ')
      let line = ''
      let lines = 0

      for (const word of words) {
        const testLine = line + (line ? ' ' : '') + word
        if (ctx.measureText(testLine).width > maxWidth && line) {
          lines++
          line = word
        } else {
          line = testLine
        }
      }
      if (line) lines++
      
      return lines * lh
    }

    // Reducir tamaño si no cabe
    while (fontSize >= 16 && !textFits) {
      const textHeight = calculateTextHeight(fontSize)
      if (textHeight <= availableHeight) {
        textFits = true
      } else {
        fontSize -= 1
      }
    }

    lineHeight = fontSize * 1.6
    ctx.fillStyle = palette.text
    ctx.font = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
    ctx.textAlign = 'left'

    // Construir líneas para justificación
    const words = fullText.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word
      if (ctx.measureText(testLine).width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)

    // Función auxiliar para renderizar texto con números de versículo
    const renderLineWithVerseNumbers = (line: string, xStart: number, yPos: number, spaceWidth?: number) => {
      const verseNumberSize = Math.round(fontSize * 0.65)
      const verseNumberFont = `700 ${verseNumberSize}px Garamond, Georgia, "Times New Roman", serif`
      const textFont = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
      
      const words = line.split(' ')
      let xPos = xStart
      
      for (let i = 0; i < words.length; i++) {
        const word = words[i]
        
        // Detectar número de versículo
        const verseMatch = word.match(/^\{\{(\d+)\}\}$/)
        if (verseMatch) {
          // Renderizar número de versículo (superíndice)
          ctx.font = verseNumberFont
          ctx.fillStyle = palette.accent
          const verseNum = verseMatch[1]
          ctx.fillText(verseNum, xPos, yPos - fontSize * 0.25)  // Elevado
          ctx.font = textFont
          ctx.fillStyle = palette.text
          xPos += ctx.measureText(verseNum).width + 4
        } else {
          // Renderizar palabra normal
          ctx.fillText(word, xPos, yPos)
          xPos += ctx.measureText(word).width + (spaceWidth ?? ctx.measureText(' ').width)
        }
      }
    }

    // Renderizar texto justificado con números de versículo
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const isLastLine = i === lines.length - 1
      
      if (isLastLine) {
        // Última línea: alineada a la izquierda sin justificar
        renderLineWithVerseNumbers(line, PADDING, y)
      } else {
        // Justificar: distribuir palabras uniformemente
        const lineWords = line.split(' ')
        if (lineWords.length === 1) {
          renderLineWithVerseNumbers(line, PADDING, y)
        } else {
          // Calcular ancho total de palabras (sin contar los marcadores de versículo)
          let totalWordsWidth = 0
          ctx.font = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
          const verseNumberSize = Math.round(fontSize * 0.65)
          const verseNumberFont = `700 ${verseNumberSize}px Garamond, Georgia, "Times New Roman", serif`
          
          for (const word of lineWords) {
            const verseMatch = word.match(/^\{\{(\d+)\}\}$/)
            if (verseMatch) {
              ctx.font = verseNumberFont
              totalWordsWidth += ctx.measureText(verseMatch[1]).width + 4
              ctx.font = `400 ${fontSize}px Garamond, Georgia, "Times New Roman", serif`
            } else {
              totalWordsWidth += ctx.measureText(word).width
            }
          }
          
          const totalSpaceWidth = maxWidth - totalWordsWidth
          const spaceWidth = totalSpaceWidth / (lineWords.length - 1)
          
          renderLineWithVerseNumbers(line, PADDING, y, spaceWidth)
        }
      }
      y += lineHeight
    }
  }

  // ── Fecha al final ─────────────────────────────────────────────────────────────
  ctx.fillStyle = palette.sub
  ctx.font = `400 32px Garamond, Georgia, "Times New Roman", serif`
  ctx.textAlign = 'center'
  ctx.fillText(data.dateStr, W / 2, H - 90)
  
  // ── Enlace del sitio web ───────────────────────────────────────────────────────
  ctx.font = `400 22px Garamond, Georgia, "Times New Roman", serif`
  const siteUrl = typeof window !== 'undefined' ? window.location.hostname : 'app-mana.vercel.app'
  ctx.fillText(siteUrl, W / 2, H - 50)
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
