import { useState } from 'react'
import { Link } from 'react-router-dom'
import googlePlayIcon from '../assets/stores/google-play-icon.png'
import { CLIENT_ANDROID_PLAY_URL, CLIENT_IOS_APP_STORE_URL } from '../constants/appStores'
import '../styles/site-footer.css'

export default function SiteFooter() {
  const [newsletterEmail, setNewsletterEmail] = useState('')
  const [newsletterDone, setNewsletterDone] = useState(false)

  const onNewsletter = (e) => {
    e.preventDefault()
    if (!newsletterEmail.trim()) return
    setNewsletterDone(true)
    setNewsletterEmail('')
  }

  return (
    <footer className="pm-footer" id="contact">
      <div className="pm-footer__inner">
        <div className="pm-footer__grid">
          <div>
            <p className="pm-footer__brandName">ONTHEWATER</p>
            <p className="pm-footer__brandTag">
              Аренда катеров по России.
              <br />
              Точность. Свет. Технологии.
            </p>
            <div className="pm-footer__social" aria-label="Соцсети">
              <a href="https://t.me/onthewater_support" target="_blank" rel="noopener noreferrer" aria-label="Telegram">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M9.5 15.5 9 19l3-2 6.5 4.5L22 4 2 12.5l5.5 1.7L17 8l-7.5 7.5z" />
                </svg>
              </a>
              <a href="https://vk.com/" target="_blank" rel="noopener noreferrer" aria-label="VK">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M3 7h2.2c.2 4 1.8 6.2 3.2 6.9V7h2.1v4.2c1.4-.2 2.9-2.2 3.4-4.2H16c-.5 2.4-2 4.3-3.2 5.1C14.1 13.8 16 16 18.8 17H16c-1.8-1.3-3.1-3-3.6-4v4H10.3V13C8.6 14.8 6 16.5 3.2 17H3c1.8-1.2 3.7-4.2 3.9-8.2H3V7z" />
                </svg>
              </a>
            </div>
            <div className="pm-footer__stores" aria-label="Мобильные приложения">
              <a
                href={CLIENT_IOS_APP_STORE_URL}
                className="pm-footer__store"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Скачать ONTHEWATER в App Store"
              >
                <svg className="pm-footer__storeIcon" width="20" height="24" viewBox="0 0 24 24" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.6-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM14.7 6.5c.6-.8 1.1-1.8.9-2.9-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-.9 2.8 1.1.1 2.1-.5 2.8-1.4z"
                  />
                </svg>
                <span className="pm-footer__storeText">
                  <span className="pm-footer__storeEyebrow">Загрузите в</span>
                  <span className="pm-footer__storeName">App Store</span>
                </span>
              </a>
              <a
                href={CLIENT_ANDROID_PLAY_URL}
                className="pm-footer__store"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Скачать ONTHEWATER в Google Play"
              >
                <img
                  className="pm-footer__storeIcon pm-footer__storeIcon--play"
                  src={googlePlayIcon}
                  alt=""
                  width="18"
                  height="18"
                  aria-hidden
                />
                <span className="pm-footer__storeText">
                  <span className="pm-footer__storeEyebrow">Доступно в</span>
                  <span className="pm-footer__storeName">Google Play</span>
                </span>
              </a>
            </div>
          </div>

          <div>
            <p className="pm-footer__colTitle">Навигация</p>
            <ul className="pm-footer__links">
              <li>
                <Link to="/boats">Катера</Link>
              </li>
              <li>
                <Link to="/#destinations">Направления</Link>
              </li>
              <li>
                <Link to="/owners">Владельцам</Link>
              </li>
              <li>
                <Link to="/#how">О нас</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="pm-footer__colTitle">Поддержка</p>
            <ul className="pm-footer__links">
              <li>
                <Link to="/terms">Условия</Link>
              </li>
              <li>
                <Link to="/privacy">Конфиденциальность</Link>
              </li>
              <li>
                <Link to="/sitemap">Карта сайта</Link>
              </li>
              <li>
                <Link to="/login">Войти</Link>
              </li>
              <li>
                <Link to="/register">Регистрация</Link>
              </li>
            </ul>
          </div>

          <div>
            <p className="pm-footer__colTitle">Контакты</p>
            <p className="pm-footer__contact">
              <a href="mailto:hello@onthewater.ru">hello@onthewater.ru</a>
            </p>
            <p className="pm-footer__contact">Россия</p>
          </div>

          <div>
            <p className="pm-footer__colTitle">Рассылка</p>
            <p className="pm-footer__newsLead">Новости сервиса и предложения на выходные.</p>
            {newsletterDone ? (
              <p className="pm-footer__newsLead pm-footer__newsLead--ok">Спасибо! Мы свяжемся с вами.</p>
            ) : (
              <form className="pm-footer__form" onSubmit={onNewsletter}>
                <label className="pm-footer__srOnly" htmlFor="pm-news-email">
                  E-mail
                </label>
                <input
                  id="pm-news-email"
                  type="email"
                  placeholder="Ваш e-mail"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  required
                />
                <button type="submit" aria-label="Подписаться">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path d="M4 12h12M12 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                </button>
              </form>
            )}
          </div>
        </div>

        <div className="pm-footer__bottom">
          <span>© {new Date().getFullYear()} ONTHEWATER</span>
          <div className="pm-footer__legal">
            <Link to="/privacy">Политика конфиденциальности</Link>
            <Link to="/terms">Пользовательское соглашение</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
