import { Link } from 'react-router-dom'
import { ChevronRight, FileText, Mail, Send, Shield } from 'lucide-react'

const FAQ = [
  {
    q: 'Когда владелец подтвердит бронирование?',
    a: 'Обычно в течение нескольких часов. Статус обновится в разделе «Мои бронирования», а на почту придёт письмо.',
  },
  {
    q: 'Как отменить поездку?',
    a: 'Пока заявка на рассмотрении, её можно отменить в карточке бронирования. После подтверждения — напишите владельцу в чат.',
  },
  {
    q: 'Где точный адрес причала?',
    a: 'Адрес и детали встречи владелец сообщает после подтверждения бронирования.',
  },
]

export default function AccountHelp() {
  return (
    <section className="acc-section" aria-labelledby="acc-help-title">
      <h1 id="acc-help-title" className="acc-title">
        Помощь
      </h1>

      <div className="acc-helpGrid">
        <a className="acc-helpCard" href="https://t.me/onthewater_support" target="_blank" rel="noopener noreferrer">
          <Send size={20} strokeWidth={1.6} aria-hidden />
          <span>
            <strong>Telegram</strong>
            <span>@onthewater_support</span>
          </span>
          <ChevronRight size={18} className="acc-helpCard__chev" aria-hidden />
        </a>
        <a className="acc-helpCard" href="mailto:hello@onthewater.ru">
          <Mail size={20} strokeWidth={1.6} aria-hidden />
          <span>
            <strong>Почта</strong>
            <span>hello@onthewater.ru</span>
          </span>
          <ChevronRight size={18} className="acc-helpCard__chev" aria-hidden />
        </a>
      </div>

      <h2 className="acc-subtitle acc-subtitle--spaced">Частые вопросы</h2>
      <div className="acc-panel acc-faq">
        {FAQ.map((item) => (
          <details key={item.q} className="acc-faq__item">
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>

      <h2 className="acc-subtitle acc-subtitle--spaced">Документы</h2>
      <div className="acc-helpGrid">
        <Link className="acc-helpCard" to="/terms">
          <FileText size={20} strokeWidth={1.6} aria-hidden />
          <span>
            <strong>Условия использования</strong>
          </span>
          <ChevronRight size={18} className="acc-helpCard__chev" aria-hidden />
        </Link>
        <Link className="acc-helpCard" to="/privacy">
          <Shield size={20} strokeWidth={1.6} aria-hidden />
          <span>
            <strong>Политика конфиденциальности</strong>
          </span>
          <ChevronRight size={18} className="acc-helpCard__chev" aria-hidden />
        </Link>
      </div>
    </section>
  )
}
