import { useState } from 'react'
import { api, BibliaRecomendacion } from '../services/api'
import { getBibleVerse } from '../lib/bible'

export function useEmotionRecommender() {
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([])
  const [showMoreEmotions, setShowMoreEmotions] = useState(false)
  const [loadingRec, setLoadingRec] = useState(false)
  const [recommendation, setRecommendation] = useState<BibliaRecomendacion | null>(null)
  const [errorRec, setErrorRec] = useState('')

  function handleEmotionClick(emotion: string) {
    setSelectedEmotions(prev =>
      prev.includes(emotion)
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    )
  }

  async function handleGetRecommendation() {
    if (selectedEmotions.length === 0 || loadingRec) return
    const feeling = [...selectedEmotions].sort((a, b) => a.localeCompare(b)).map(e => e.toLowerCase()).join(',')

    setLoadingRec(true)
    setErrorRec('')
    setRecommendation(null)

    try {
      const rec = await api.getBibliaRecomendacion(feeling)
      const verseText = await getBibleVerse(rec.libro, rec.capitulo, rec.versiculo)
      setRecommendation({ ...rec, textoVersiculo: verseText ?? '' })
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_INPUT') {
        setErrorRec('Contanos algo sobre cómo te sentís para buscarte un pasaje que te acompañe.')
      } else {
        setErrorRec('No se pudo obtener una recomendación. Intentá de nuevo.')
      }
    } finally {
      setLoadingRec(false)
    }
  }

  return {
    selectedEmotions,
    showMoreEmotions,
    setShowMoreEmotions,
    loadingRec,
    recommendation,
    setRecommendation,
    errorRec,
    handleEmotionClick,
    handleGetRecommendation,
  }
}
