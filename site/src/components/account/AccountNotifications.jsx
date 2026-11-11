import { useEffect, useState } from 'react'
import { fetchNotificationSettings, updateNotificationSettings } from '../../api/auth'

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
    </section>
  )
}
