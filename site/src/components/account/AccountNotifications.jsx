import { useEffect, useState } from 'react'
import { fetchNotificationSettings, updateNotificationSettings } from '../../api/auth'
import { isSoundEnabled, playNotifySound, setSoundEnabled } from '../../lib/notifySound'

const ITEMS = [
  {
    key: 'email_booking_notifications',
    title: 'Бронирования',
    text: 'Подтверждение, изменение и отмена ваших поездок.',
  },
  {
    key: 'email_message_notifications',
    title: 'Сообщения',
    text: 'Новые ответы владельцев катеров в чате.',
  },
  {
    key: 'email_news_notifications',
    title: 'Новости и предложения',
    text: 'Подборки маршрутов, сезонные скидки и новые катера.',
  },
]

export default function AccountNotifications({ token, email }) {
  const [settings, setSettings] = useState(null)
  const [error, setError] = useState('')
  const [sound, setSound] = useState(isSoundEnabled)

  const toggleSound = () => {
    const next = !sound
    setSound(next)
    setSoundEnabled(next)
    if (next) playNotifySound('message', { force: true })
  }

  useEffect(() => {
    let cancelled = false
    fetchNotificationSettings(token)
      .then((data) => {
        if (cancelled) return
        setSettings(Object.fromEntries(ITEMS.map(({ key }) => [key, data?.[key] !== false])))
      })
      .catch(() => {
        if (!cancelled) setError('Не удалось загрузить настройки')
      })
    return () => {
      cancelled = true
    }
  }, [token])

  const toggle = async (key) => {
    const prev = settings[key]
    setSettings((s) => ({ ...s, [key]: !prev }))
    setError('')
    try {
      await updateNotificationSettings(token, { [key]: !prev })
    } catch (err) {
      setSettings((s) => ({ ...s, [key]: prev }))
      setError(err?.message || 'Не удалось сохранить настройки')
    }
  }

  return (
    <section className="acc-section" aria-labelledby="acc-notif-title">
      <h1 id="acc-notif-title" className="acc-title">
        Уведомления
      </h1>
      <p className="acc-lead">Письма приходят на {email || 'вашу почту'}. Push-уведомления настраиваются в мобильном приложении.</p>

      {!settings && !error ? <p className="acc-muted">Загружаем…</p> : null}
      {error ? <p className="acc-error">{error}</p> : null}

      {settings ? (
        <div className="acc-panel">
          {ITEMS.map((item) => (
            <label key={item.key} className="acc-switchRow">
              <span>
                <strong>{item.title}</strong>
                <span>{item.text}</span>
              </span>
              <input
                type="checkbox"
                className="acc-switch"
                checked={settings[item.key]}
                onChange={() => toggle(item.key)}
              />
            </label>
          ))}
        </div>
      ) : null}

      <h2 className="acc-subtitle acc-subtitle--spaced">На сайте</h2>
      <div className="acc-panel">
        <label className="acc-switchRow">
          <span>
            <strong>Звуковые оповещения</strong>
            <span>Короткий сигнал при новом сообщении и изменении статуса бронирования, пока сайт открыт.</span>
          </span>
          <input type="checkbox" className="acc-switch" checked={sound} onChange={toggleSound} />
        </label>
        <div className="acc-soundPreview">
          <button type="button" className="acc-btn acc-btn--ghost" onClick={() => playNotifySound('message', { force: true })}>
            Сигнал сообщения
          </button>
          <button type="button" className="acc-btn acc-btn--ghost" onClick={() => playNotifySound('booking', { force: true })}>
            Сигнал бронирования
          </button>
        </div>
      </div>
    </section>
  )
}
