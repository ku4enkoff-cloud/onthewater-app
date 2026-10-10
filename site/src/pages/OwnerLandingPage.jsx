import googlePlayIcon from '../assets/icon-g-p.webp'
import appleStoreIcon from '../assets/icon-a-s.webp'
import { OWNER_ANDROID_PLAY_URL, OWNER_IOS_APP_STORE_URL } from '../constants/appStores'
import { useOwnerLandingSeo } from '../seo/useOwnerLandingSeo.js'

export default function OwnerLandingPage() {
  useOwnerLandingSeo()

  return (
    <main className="owner-page">
      <section className="owner-page__hero">
        <div className="owner-page__card">
          <h1 className="owner-page__title">Разместить объявление</h1>
          <p className="owner-page__text">
            Чтобы размещать объявления о сдаче судна, скачайте мобильное приложение для владельцев ONTHEWATER.
          </p>
          <div className="owner-page__stores" aria-label="Скачать приложение для владельцев">
            <a
              href={OWNER_IOS_APP_STORE_URL}
              className="owner-page__store owner-page__store--apple"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Скачать приложение для владельцев в App Store"
            >
              <img src={appleStoreIcon} alt="App Store" className="owner-page__storeImg" />
            </a>
            <a
              href={OWNER_ANDROID_PLAY_URL}
              className="owner-page__store owner-page__store--google"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Скачать приложение для владельцев в Google Play"
            >
              <img src={googlePlayIcon} alt="Google Play" className="owner-page__storeImg" />
            </a>
          </div>
        </div>
      </section>
    </main>
  )
}
