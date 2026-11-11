import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Star } from 'lucide-react'
import { deleteMyReview, updateMyReview } from '../../api/auth'
import { boatDetailPath } from '../../boatUrl'
import { REVIEW_STATUS_LABELS } from './accountUtils'
import ReviewModal from './ReviewModal.jsx'

function Stars({ value }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(value) || 0)))
  return (
    <span className="acc-review__stars" aria-label={`Оценка ${n} из 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} strokeWidth={1.5} fill={i <= n ? 'currentColor' : 'none'} className={i <= n ? 'is-on' : ''} />
      ))}
    </span>
  )
}

export default function AccountReviews({ token, reviews, loading, onChanged }) {
  const [editing, setEditing] = useState(null)

  const remove = async (review) => {
    if (!window.confirm('Удалить отзыв?')) return
    try {
      await deleteMyReview(token, review.id)
      onChanged()
    } catch (err) {
      window.alert(err?.message || 'Не удалось удалить отзыв')
    }
  }

  return (
    <section className="acc-section" aria-labelledby="acc-reviews-title">
      <h1 id="acc-reviews-title" className="acc-title">
        Отзывы
      </h1>

      {loading ? (
        <p className="acc-muted">Загружаем…</p>
      ) : reviews.length === 0 ? (
        <div className="acc-empty">
          <p>Вы ещё не оставляли отзывов. Оценить поездку можно в разделе «Мои бронирования» после её завершения.</p>
        </div>
      ) : (
        <div className="acc-reviews">
          {reviews.map((r) => {
            const status = String(r.status || 'pending').toLowerCase()
            return (
              <article key={r.id} className="acc-review">
                <div className="acc-review__head">
                  <div>
                    {r.boat_id ? (
                      <Link className="acc-review__boat" to={boatDetailPath({ id: r.boat_id, title: r.boat_title })}>
                        {r.boat_title || 'Катер'}
                      </Link>
                    ) : (
                      <span className="acc-review__boat">{r.boat_title || 'Катер'}</span>
                    )}
                    <div className="acc-review__meta">
                      <Stars value={r.rating} />
                      {r.created_at ? (
                        <time>{new Date(r.created_at).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}</time>
                      ) : null}
                    </div>
                  </div>
                  <span className={`acc-status acc-status--review-${status}`}>{REVIEW_STATUS_LABELS[status] || status}</span>
                </div>
                <p className="acc-review__text">{r.text || '—'}</p>
                <div className="acc-review__actions">
                  <button type="button" className="acc-link" onClick={() => setEditing(r)}>
                    Редактировать
                  </button>
                  <button type="button" className="acc-link acc-link--muted" onClick={() => remove(r)}>
                    Удалить
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {editing ? (
        <ReviewModal
          title={editing.boat_title || 'Катер'}
          initialRating={Number(editing.rating) || 5}
          initialText={editing.text || ''}
          submitLabel="Сохранить"
          onClose={() => setEditing(null)}
          onSubmit={async (payload) => {
            await updateMyReview(token, editing.id, payload)
            onChanged()
          }}
        />
      ) : null}
    </section>
  )
}
