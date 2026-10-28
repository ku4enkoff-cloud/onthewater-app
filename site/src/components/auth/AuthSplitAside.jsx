import googlePlayIcon from '../../assets/stores/google-play-icon.webp'
import { CLIENT_ANDROID_PLAY_URL, CLIENT_IOS_APP_STORE_URL } from '../../constants/appStores'

const BENEFITS = [
  {
    id: 'favorites',
    title: 'Избранные катера',
    text: 'Сохраняйте понравившиеся суда и находите их в один клик.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M12 20.4S4.5 15.2 4.5 9.8A3.9 3.9 0 0 1 12 7.2a3.9 3.9 0 0 1 7.5 2.6c0 5.4-7.5 10.6-7.5 10.6Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'booking',
    title: 'Быстрое бронирование',
    text: 'Бронируйте катера быстро и без лишних шагов.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3.75" y="5" width="16.5" height="15" rx="2" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.75 10h16.5M8 3.5v4M16 3.5v4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: 'chat',
    title: 'Чат с владельцем',
    text: 'Связывайтесь с владельцами напрямую и уточняйте детали.',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M5 17.2V8.6A2.6 2.6 0 0 1 7.6 6h8.8A2.6 2.6 0 0 1 19 8.6v5.4a2.6 2.6 0 0 1-2.6 2.6H9.1L5 19.4v-2.2Z"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
]

export default function AuthSplitAside() {
  return (
    <aside className="auth-register__benefits" aria-labelledby="auth-split-benefits-title">
      <h2 id="auth-split-benefits-title" className="auth-register__benefitsTitle">
        Преимущества с ONTHEWATER
      </h2>
      <ul className="auth-register__benefitList">
        {BENEFITS.map((item) => (
          <li key={item.id} className="auth-register__benefit">
            <span className="auth-register__benefitIcon">{item.icon}</span>
            <div className="auth-register__benefitBody">
              <p className="auth-register__benefitTitle">{item.title}</p>
              <p className="auth-register__benefitText">{item.text}</p>
            </div>
          </li>
        ))}
      </ul>

      <div className="auth-register__stores">
        <p className="auth-register__storesLabel">Приложение ONTHEWATER</p>
        <div className="pm-app__stores auth-register__storeRow" aria-label="Скачать приложение">
          <a
            href={CLIENT_IOS_APP_STORE_URL}
            className="pm-app__badge"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Скачать ONTHEWATER в App Store"
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
            href={CLIENT_ANDROID_PLAY_URL}
            className="pm-app__badge"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Скачать ONTHEWATER в Google Play"
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
      </div>
    </aside>
  )
}
