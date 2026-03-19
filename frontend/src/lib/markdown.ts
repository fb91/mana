export type Segment = { type: 'text' | 'bold' | 'italic'; content: string }

export function splitMarkdown(text: string): Segment[] {
  const result: Segment[] = []
  const regex = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*)/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      result.push({ type: 'text', content: text.slice(lastIndex, match.index) })
    }
    if (match[0].startsWith('**')) {
      result.push({ type: 'bold', content: match[0].slice(2, -2) })
    } else {
      result.push({ type: 'italic', content: match[0].slice(1, -1) })
    }
    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    result.push({ type: 'text', content: text.slice(lastIndex) })
  }

  return result
}
