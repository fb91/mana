import { useState } from 'react'
import { useAppStore, SavedCitation } from '../store/useAppStore'
import Icon from './Icon'

interface Props {
  abbr: string
  bookName: string
  chapter: number
  verseNumbers: number[]
  verseTexts: string[]
  /** If provided, we are editing an existing citation (shows delete button) */
  existing?: SavedCitation
  onClose: () => void
}

export default function SaveCitationModal({
  abbr, bookName, chapter, verseNumbers, verseTexts, existing, onClose
}: Props) {
  const { addSavedCitation, updateSavedCitation, removeSavedCitation, savedCitations } = useAppStore()

  const [comment, setComment] = useState(existing?.comment ?? '')
  const [category, setCategory] = useState(existing?.category ?? '')
  const [showCatSuggestions, setShowCatSuggestions] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  // Unique categories already used
  const existingCategories = Array.from(
    new Set(savedCitations.map(c => c.category).filter(Boolean))
  )

  const filteredCategories = existingCategories.filter(c =>
    category ? c.toLowerCase().includes(category.toLowerCase()) : true
  )

  const verseLabel = verseNumbers.length === 1
    ? `${bookName} ${chapter}:${verseNumbers[0]}`
    : `${bookName} ${chapter}:${verseNumbers[0]}-${verseNumbers[verseNumbers.length - 1]}`

  function handleSave() {
    if (existing) {
      updateSavedCitation(existing.id, { comment: comment.trim(), category: category.trim() })
    } else {
      addSavedCitation({ abbr, bookName, chapter, verseNumbers, verseTexts, comment: comment.trim(), category: category.trim() })
    }
    onClose()
  }

  function handleDelete() {
    if (!confirmDelete) { setConfirmDelete(true); return }
    removeSavedCitation(existing!.id)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative w-full bg-crema dark:bg-oscuro-bg rounded-t-3xl px-5 pt-5 pb-8
                   shadow-2xl animate-slide-up max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 rounded-full bg-crema-300 dark:bg-oscuro-border mx-auto mb-5" />

        {/* Header */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h2 className="font-serif text-xl font-semibold text-cafe-dark dark:text-crema-200">
              {existing ? 'Editar cita guardada' : 'Guardar cita bíblica'}
            </h2>
            <p className="text-dorado text-sm font-medium mt-0.5">{verseLabel}</p>
          </div>
          {existing && (
            <button
              onClick={handleDelete}
              className={[
                'flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl transition-all',
                confirmDelete
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                  : 'text-cafe-light dark:text-crema-400 hover:text-red-500',
              ].join(' ')}
            >
              <Icon name="trash" size={13} />
              {confirmDelete ? 'Confirmar' : 'Borrar'}
            </button>
          )}
        </div>

        {/* Verse preview */}
        <div className="bg-dorado/10 dark:bg-dorado/15 border border-dorado/30 rounded-2xl p-3.5 mt-4 mb-5">
          {verseNumbers.slice(0, 3).map((n, i) => (
            <p key={n} className="font-serif text-sm text-cafe-dark dark:text-crema-200 leading-relaxed">
              <span className="text-dorado font-bold text-xs mr-1.5 select-none">{n}</span>
              {verseTexts[i]}
            </p>
          ))}
          {verseNumbers.length > 3 && (
            <p className="text-xs text-cafe-light dark:text-crema-400 mt-1">
              +{verseNumbers.length - 3} versículos más
            </p>
          )}
        </div>

        {/* Category input */}
        <div className="mb-4 relative">
          <label className="text-xs font-semibold text-cafe-light dark:text-crema-400 uppercase tracking-wider mb-1.5 block">
            Carpeta / Categoría
          </label>
          <input
            type="text"
            value={category}
            onChange={e => { setCategory(e.target.value); setShowCatSuggestions(true) }}
            onFocus={() => setShowCatSuggestions(true)}
            onBlur={() => setTimeout(() => setShowCatSuggestions(false), 150)}
            placeholder="ej. Promesas, Consolación, Adviento..."
            className="w-full bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                       rounded-2xl px-4 py-3 text-sm text-cafe-dark dark:text-crema-200
                       placeholder:text-cafe-light/50 dark:placeholder:text-crema-400/50
                       focus:outline-none focus:border-dorado/60 focus:ring-1 focus:ring-dorado/30
                       transition-colors"
          />
          {/* Suggestions */}
          {showCatSuggestions && filteredCategories.length > 0 && (
            <div className="absolute top-full mt-1 left-0 right-0 bg-white dark:bg-oscuro-surface
                            border border-crema-200 dark:border-oscuro-border rounded-2xl shadow-lg
                            overflow-hidden z-10">
              {filteredCategories.map(cat => (
                <button
                  key={cat}
                  onMouseDown={() => { setCategory(cat); setShowCatSuggestions(false) }}
                  className="w-full text-left px-4 py-2.5 text-sm text-cafe-dark dark:text-crema-200
                             hover:bg-crema-100 dark:hover:bg-oscuro-border transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Comment textarea */}
        <div className="mb-6">
          <label className="text-xs font-semibold text-cafe-light dark:text-crema-400 uppercase tracking-wider mb-1.5 block">
            Comentario personal (opcional)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Anotá lo que te inspira este versículo..."
            rows={3}
            className="w-full bg-white dark:bg-oscuro-surface border border-crema-200 dark:border-oscuro-border
                       rounded-2xl px-4 py-3 text-sm text-cafe-dark dark:text-crema-200
                       placeholder:text-cafe-light/50 dark:placeholder:text-crema-400/50
                       focus:outline-none focus:border-dorado/60 focus:ring-1 focus:ring-dorado/30
                       transition-colors resize-none"
          />
        </div>

        {/* Save button */}
        <button
          onClick={handleSave}
          className="w-full flex items-center justify-center gap-2.5 bg-dorado text-crema-50
                     font-semibold text-sm rounded-2xl py-3.5 px-5
                     active:scale-[0.98] transition-all duration-150"
        >
          <Icon name="bookmark" size={16} />
          {existing ? 'Guardar cambios' : 'Guardar cita'}
        </button>

        <button
          onClick={onClose}
          className="w-full text-center text-sm text-cafe-light dark:text-crema-400 mt-3 py-1.5"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
