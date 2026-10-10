import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { cancelBooking, fetchMyBookings } from '../../api/bookings'
import { getListPhotoUrl } from '../../config'
import { useAuth } from '../../context/AuthContext'
import { useNoIndexSeo } from '../../seo/useNoIndexSeo'
import UnauthorizedCard from '../components/UnauthorizedCard.jsx'

const STATUS = {
  pending_payment: { label: 'Ожидает оплаты', color: '#6b7280' },
  pending: { label: 'На рассмотрении', color: '#FF9800' },
  confirmed: { label: 'Подтверждено', color: '#10b981' },
  active: { label: 'Активно', color: '#1b365d' },
  completed: { label: 'Завершено', color: '#16a34a' },
  cancelled: { label: 'Отменено', color: '#ef4444' },
}

function startAt(item) {
  return item.start_at || item.date_start
}

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatTime(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
}

export default function MobileBookingsScreen() {
  useNoIndexSeo('Бронирования | ONTHEWATER')
  const { user, token } = useAuth()
  const navigate = useNavigate()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)
  const [cancelling, setCancelling] = useState(false)

  const load = useCallback(async () => {
    if (!token) {
      setBookings([])
      setLoading(false)
      return
    }
    try {
      const rows = await fetchMyBookings(token)
      setBookings(rows)
    } catch {
      setBookings([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    setLoading(true)
    load()
  }, [load])

  if (!user) {
    return (
      <div className="mapp-screen">
        <header className="mapp-screen__header">
          <h1 className="mapp-screen__title">Брони</h1>
        </header>
        <UnauthorizedCard text="Войдите, чтобы видеть свои бронирования." />
      </div>
    )
  }

  return (
    <div className="mapp-screen">
      <header className="mapp-screen__header">
        <h1 className="mapp-screen__title">Брони</h1>
      </header>
      {loading ? (
        <p className="mapp-empty">Загружаем…</p>
      ) : bookings.length === 0 ? (
        <div className="mapp-empty">
          <p>Пока нет бронирований.</p>
          <p style={{ marginTop: 16 }}>
            <Link className="mapp-btn" to="/boats">
              Найти катер
            </Link>
          </p>
        </div>
      ) : (
        <div className="mapp-list">
          {bookings.map((item) => {
            const st = STATUS[item.status] || { label: item.status, color: '#6b7280' }
            const photoSrc = item.boat_photo || item.boat_image
            const photo =
              getListPhotoUrl(typeof photoSrc === 'string' ? photoSrc : photoSrc?.url) ||
              'https://placehold.co/200x200?text=Фото'
            const start = startAt(item)
            return (
              <button
                key={item.id}
                type="button"
                className="mapp-bookingCard"
                onClick={() => setSelected(item)}
              >
                <img src={photo} alt="" />
                <div className="mapp-bookingCard__body">
                  <h3 className="mapp-bookingCard__title">{item.boat_title || 'Катер'}</h3>
                  <p className="mapp-bookingCard__meta">
                    {formatDate(start)} · {formatTime(start)}
                  </p>
                  <span className="mapp-status" style={{ color: st.color }}>
                    {st.label}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selected ? (
        <div className="mapp-modal" role="dialog" aria-modal="true" onClick={() => setSelected(null)}>
          <div className="mapp-modal__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mapp-modal__head">
              <h2>{selected.boat_title || 'Бронирование'}</h2>
              <button type="button" className="mapp-modal__close" onClick={() => setSelected(null)}>
                ×
              </button>
            </div>
            <p className="mapp-bookingCard__meta">
              {formatDate(startAt(selected))} · {formatTime(startAt(selected))}
            </p>
            <p className="mapp-bookingCard__meta" style={{ marginTop: 8 }}>
              Статус: {(STATUS[selected.status] || {}).label || selected.status}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 20 }}>
              {selected.boat_id ? (
                <button
                  type="button"
                  className="mapp-btn"
                  onClick={() => navigate(`/boats/${selected.boat_id}`)}
                >
                  Открыть катер
                </button>
              ) : null}
              {selected.status === 'pending' || selected.status === 'pending_payment' ? (
                <button
                  type="button"
                  className="mapp-btn mapp-btn--ghost"
                  disabled={cancelling}
                  onClick={async () => {
                    if (!window.confirm('Отменить бронирование?')) return
                    setCancelling(true)
                    try {
                      await cancelBooking(token, selected.id)
                      setSelected(null)
                      await load()
                    } catch (e) {
                      window.alert(e?.message || 'Не удалось отменить')
                    } finally {
                      setCancelling(false)
                    }
                  }}
                >
                  {cancelling ? 'Отмена…' : 'Отменить бронь'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
