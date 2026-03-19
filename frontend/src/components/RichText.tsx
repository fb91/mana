import { splitMarkdown } from '../lib/markdown'

interface Props {
  text: string
  className?: string
}

export default function RichText({ text, className }: Props) {
  const paragraphs = text.split('\n\n')

  return (
    <span className={className}>
      {paragraphs.map((para, pi) => (
        <span key={pi}>
          {pi > 0 && <><br /><br /></>}
          {para.split('\n').map((line, li) => (
            <span key={li}>
              {li > 0 && <br />}
              {splitMarkdown(line).map((seg, si) =>
                seg.type === 'bold'
                  ? <strong key={si}>{seg.content}</strong>
                  : seg.type === 'italic'
                  ? <em key={si}>{seg.content}</em>
                  : seg.content
              )}
            </span>
          ))}
        </span>
      ))}
    </span>
  )
}
