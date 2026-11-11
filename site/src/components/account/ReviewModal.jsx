import { useEffect, useState } from 'react'
import { Star, X } from 'lucide-react'

const MIN_TEXT = 20

/** Создание / редактирование отзыва: onSubmit({ rating, text }) должен бросать Error при неудаче. */
export default function ReviewModal({ title, initialRating = 5, initialText = '', submitLabel = 'Отправить отзыв', onSubmit, onClose }) {
  const [rating, setRating] = useState(initialRating)
  const [hover, setHover] = useState(0)
  const [text, setText] = useState(initialText)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const tooShort = text.trim().length < MIN_TEXT

  const submit = async (e) => {
    e.preventDefault()
    if (tooShort || saving) return
    try {
      setSaving(true)
      setError('')
      await onSubmit({ rating, text: text.trim() })
      onClose()
    } catch (err) {
      setError(err?.message || 'Не удалось сохранить отзыв')
    } finally {
      setSaving(false)
    }
  }

  const shown = hover || rating

  return (
    <div
      className="acc-modal"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <form className="acc-modal__sheet acc-modal__sheet--narrow" role="dialog" aria-modal="true" aria-labelledby="acc-review-title" onSubmit={submit}>
        <button type="button" className="acc-modal__close" onClick={onClose} aria-label="Закрыть">
          <X size={18} />
        </button>
        <div className="acc-modal__body">
          <p className="acc-eyebrow">Отзыв</p>
          <h2 id="acc-review-title" className="acc-modal__title">
            {title}
          </h2>
          <div className="acc-stars" role="radiogroup" aria-label="Оценка" onMouseLeave={() => setHover(0)}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={rating === n}
                aria-label={`${n} из 5`}
                className={`acc-stars__btn${n <= shown ? ' is-on' : ''}`}
                onMouseEnter={() => setHover(n)}
                onClick={() => setRating(n)}
              >
                <Star size={26} strokeWidth={1.5} />
              </button>
            ))}
          </div>
          <label className="acc-field">
            <span>Расскажите о поездке</span>
            <textarea
              rows={5}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Как прошла прогулка, состояние катера, работа капитана…"
            />
          </label>
          <p className="acc-hint">{tooShort ? `Минимум ${MIN_TEXT} символов` : 'Отзыв появится после модерации'}</p>
          {error ? <p className="acc-error">{error}</p> : null}
          <div className="acc-modal__actions">
            <button type="submit" className="acc-btn" disabled={tooShort || saving}>
              {saving ? 'Сохраняем…' : submitLabel}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
