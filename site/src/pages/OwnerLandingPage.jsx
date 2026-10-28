import { Link } from 'react-router-dom'
import googlePlayIcon from '../assets/stores/google-play-icon.webp'
import { OWNER_ANDROID_PLAY_URL, OWNER_IOS_APP_STORE_URL } from '../constants/appStores'
import { useOwnerLandingSeo } from '../seo/useOwnerLandingSeo.js'
import '../styles/precision-home.css'

const BENEFITS = [
  {
    id: 'listing',
    title: 'Объявление в поиске и на карте',
    text: 'Гости видят ваше судно рядом с собой и могут сразу отправить заявку на удобное время.',
  },
  {
    id: 'calendar',
    title: 'Календарь занятости',
    text: 'Отмечайте занятые слоты — меньше накладок и ручных согласований в мессенджерах.',
  },
  {
    id: 'chat',
    title: 'Заявки и чат в одном месте',
    text: 'Переписка с гостем, статус бронирования и детали выхода остаются в приложении владельца.',
  },
]

export default function OwnerLandingPage() {
  useOwnerLandingSeo()

  return (
    <main className="owner-page">
      <div className="owner-page__wrap">
        <header className="owner-page__hero">
          <p className="owner-page__eyebrow">Владельцам</p>
          <h1 className="owner-page__title">Сдайте катер в аренду через ONTHEWATER</h1>
          <p className="owner-page__lead">
            Разместите объявление в приложении для владельцев: гости найдут судно на сайте и в
            клиентском приложении, а вы будете принимать заявки, вести календарь и общаться с
            клиентами без лишней суеты.
          </p>
          <div className="pm-app__stores owner-page__stores" aria-label="Скачать приложение для владельцев">
            <a
              href={OWNER_IOS_APP_STORE_URL}
              className="pm-app__badge"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Скачать приложение для владельцев в App Store"
            >
              <svg className="pm-app__badgeIcon" width="22" height="26" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.6-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM14.7 6.5c.6-.8 1.1-1.8.9-2.9-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-.9 2.8 1.1.1 2.1-.5 2.8-1.4z"
                />
              </svg>
              <span className="pm-app__badgeText">
                <span className="pm-app__badgeEyebrow">Загрузите в</span>
                <span className="pm-app__badgeName">App Store</span>
              </span>
            </a>
            <a
              href={OWNER_ANDROID_PLAY_URL}
              className="pm-app__badge"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Скачать приложение для владельцев в Google Play"
            >
              <img
                className="pm-app__badgeIcon pm-app__badgeIcon--play"
                src={googlePlayIcon}
                alt=""
                width="22"
                height="22"
                aria-hidden
              />
              <span className="pm-app__badgeText">
                <span className="pm-app__badgeEyebrow">Доступно в</span>
                <span className="pm-app__badgeName">Google Play</span>
              </span>
            </a>
          </div>
        </header>

        <section className="owner-page__section" aria-labelledby="owner-how">
          <h2 id="owner-how" className="owner-page__h2">
            Как начать сдавать катер
          </h2>
          <ol className="owner-page__steps">
            <li>
              <span className="owner-page__stepNum">01</span>
              <div>
                <p className="owner-page__stepTitle">Скачайте приложение владельца</p>
                <p className="owner-page__stepText">
                  Регистрация владельца доступна только в мобильном приложении ONTHEWATER для
                  владельцев.
                </p>
              </div>
            </li>
            <li>
              <span className="owner-page__stepNum">02</span>
              <div>
                <p className="owner-page__stepTitle">Создайте объявление</p>
                <p className="owner-page__stepText">
                  Добавьте фото, описание, тарифы, вместимость и город — карточка появится в поиске
                  гостей.
                </p>
              </div>
            </li>
            <li>
              <span className="owner-page__stepNum">03</span>
              <div>
                <p className="owner-page__stepTitle">Принимайте заявки</p>
                <p className="owner-page__stepText">
                  Следите за календарём, отвечайте в чате и подтверждайте удобные слоты.
                </p>
              </div>
            </li>
          </ol>
        </section>

        <section className="owner-page__section" aria-labelledby="owner-benefits">
          <h2 id="owner-benefits" className="owner-page__h2">
            Зачем размещать судно у нас
          </h2>
          <ul className="owner-page__benefits">
            {BENEFITS.map((item) => (
              <li key={item.id} className="owner-page__benefit">
                <p className="owner-page__benefitTitle">{item.title}</p>
                <p className="owner-page__benefitText">{item.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="owner-page__section owner-page__section--cta" aria-labelledby="owner-download">
          <h2 id="owner-download" className="owner-page__h2">
            Готовы разместить объявление?
          </h2>
          <p className="owner-page__sectionLead">
            Скачайте приложение для владельцев и опубликуйте катер или яхту. Гости уже ищут выход на
            воду на сайте{' '}
            <Link to="/">onthewater.ru</Link> и в клиентском приложении.
          </p>
          <div className="pm-app__stores owner-page__stores" aria-label="Скачать приложение для владельцев">
            <a
              href={OWNER_IOS_APP_STORE_URL}
              className="pm-app__badge"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="App Store — приложение для владельцев"
            >
              <svg className="pm-app__badgeIcon" width="22" height="26" viewBox="0 0 24 24" aria-hidden>
                <path
                  fill="currentColor"
                  d="M16.7 12.6c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3.1-1.6-1.3-.1-2.5.8-3.2.8-.7 0-1.7-.7-2.8-.7-1.4 0-2.8.9-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.6 2.2 2.8 2.1 1.1 0 1.5-.7 2.9-.7s1.7.7 2.9.7c1.2 0 1.9-1 2.6-2 .8-1.2 1.2-2.3 1.2-2.4-.1 0-2.3-.9-2.3-3.4zM14.7 6.5c.6-.8 1.1-1.8.9-2.9-1 .1-2.1.7-2.8 1.5-.6.7-1.1 1.8-.9 2.8 1.1.1 2.1-.5 2.8-1.4z"
                />
              </svg>
              <span className="pm-app__badgeText">
                <span className="pm-app__badgeEyebrow">Загрузите в</span>
                <span className="pm-app__badgeName">App Store</span>
              </span>
            </a>
            <a
              href={OWNER_ANDROID_PLAY_URL}
              className="pm-app__badge"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Google Play — приложение для владельцев"
            >
              <img
                className="pm-app__badgeIcon pm-app__badgeIcon--play"
                src={googlePlayIcon}
                alt=""
                width="22"
                height="22"
                aria-hidden
              />
              <span className="pm-app__badgeText">
                <span className="pm-app__badgeEyebrow">Доступно в</span>
                <span className="pm-app__badgeName">Google Play</span>
              </span>
            </a>
          </div>
        </section>
      </div>
    </main>
  )
}
