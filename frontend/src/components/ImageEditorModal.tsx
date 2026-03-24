// ImageEditorModal — adapter wrapper around StoryImageEditor.
// Keeps the existing ImageEditorData interface so callers don't change.
import StoryImageEditor from './StoryImageEditor'

export interface ImageEditorData {
  headerLabel: string
  verseRef: string
  verses: { number: number; text: string }[]
  footer?: string
  defaultThemeId?: string
}

interface Props {
  data: ImageEditorData
  onClose: () => void
}

export default function ImageEditorModal({ data, onClose }: Props) {
  const text = data.verses.map(v => v.text).join(' ')
  const reference = [data.headerLabel, data.verseRef].filter(Boolean).join(' — ')

  return (
    <StoryImageEditor
      text={text}
      reference={reference}
      onClose={onClose}
    />
  )
}
