import { Link } from 'react-router-dom'
import { useAboutPageSeo } from '../seo/useAboutPageSeo.js'
import {
  CLIENT_ANDROID_PLAY_URL,
  CLIENT_IOS_APP_STORE_URL,
} from '../constants/appStores'
import googlePlayIcon from '../assets/stores/google-play-icon.webp'
import '../styles/precision-home.css'

export default function AboutPage() {
  useAboutPageSeo()

  return (
    <main className="about-page">
      <div className="about-page__wrap">
        <header className="about-page__hero">
          <p className="about-page__eyebrow">ONTHEWATER</p>
          <h1 className="about-page__title">О сервисе аренды катеров и яхт</h1>
          <p className="about-page__lead">
            ONTHEWATER помогает найти водную технику рядом с вами, сравнить условия и забронировать
            выход на воду без лишних звонков и переписок. Мы соединяем гостей и владельцев катеров
            в одном сервисе — на сайте и в мобильном приложении.
          </p>
          <div className="about-page__actions">
            <Link to="/boats" className="about-page__cta">
              Найти катер
            </Link>
            <Link to="/owners" className="about-page__cta about-page__cta--ghost">
              Сдать катер в аренду
            </Link>
          </div>
        </header>

        <section className="about-page__section" aria-labelledby="about-what">
          <h2 id="about-what" className="about-page__h2">
            Что такое ONTHEWATER
          </h2>
          <p>
            ONTHEWATER — онлайн-платформа аренды катеров, яхт и другой водной техники по России.
            Гости видят актуальные объявления, цены за час или смену, наличие капитана и свободные
            слоты. Владельцы размещают суда, принимают заявки и ведут переписку с клиентами в
            отдельном приложении.
          </p>
          <p>
            Наша цель — сделать отдых на воде таким же понятным, как заказ такси или бронирование
            жилья: прозрачная цена, понятный график и быстрый контакт с владельцем.
          </p>
        </section>

        <section className="about-page__section" aria-labelledby="about-guests">
          <h2 id="about-guests" className="about-page__h2">
            Для гостей: аренда катера онлайн
          </h2>
          <p>
            Ищите суда на карте и в каталоге, фильтруйте по городу, дате, числу гостей и длительности
            прогулки. В карточке катера сразу видны фото, описание, тарифы и свободное время —
            без «уточните у менеджера».
          </p>
          <ul className="about-page__list">
            <li>Поиск катеров и яхт по городу и на карте рядом с вами</li>
            <li>Онлайн-заявка на бронирование с выбором даты, времени и длительности</li>
            <li>Избранное, чат с владельцем и статус заявки в личном кабинете</li>
            <li>Мобильное приложение ONTHEWATER для iOS и Android</li>
          </ul>
          <p>
            Зарегистрируйтесь один раз — и сможете быстро повторять бронирования на любимые
            маршруты и суда.
          </p>
        </section>

        <section className="about-page__section" aria-labelledby="about-app">
          <h2 id="about-app" className="about-page__h2">
            Мобильное приложение ONTHEWATER
          </h2>
          <p>
            Приложение повторяет сценарии сайта: каталог и карта катеров, избранное, бронирования и
            переписка с владельцем. Удобно, когда вы уже у воды и хотите быстро подтвердить детали
            прогулки или найти ближайший свободный катер.
          </p>
          <p>
            Для владельцев есть отдельное приложение: размещение объявления, календарь занятости,
            заявки и выплаты. Так гости и владельцы работают в привычных интерфейсах, а заявки не
            теряются в мессенджерах.
          </p>
          <div className="pm-app__stores about-page__stores" aria-label="Скачать приложение">
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
        </section>

        <section className="about-page__section" aria-labelledby="about-owners">
          <h2 id="about-owners" className="about-page__h2">
            Для владельцев водной техники
          </h2>
          <p>
            Если у вас есть катер или яхта, ONTHEWATER помогает получать заявки от заинтересованных
            гостей: объявление видно в поиске и на карте, календарь занятости снижает риск накладок,
            а переписка остаётся в сервисе.
          </p>
          <p>
            Подробнее о размещении — на странице{' '}
            <Link to="/owners">для владельцев</Link>. Там же ссылки на приложения владельца в App
            Store и Google Play.
          </p>
        </section>

        <section className="about-page__section" aria-labelledby="about-why">
          <h2 id="about-why" className="about-page__h2">
            Почему выбирают нас
          </h2>
          <ul className="about-page__list">
            <li>
              <strong>Цена и слоты сразу.</strong> Не нужно ждать ответа, чтобы понять, свободен ли
              катер и сколько стоит прогулка.
            </li>
            <li>
              <strong>Карта и города.</strong> Удобно искать суда рядом с вами или в выбранном
              регионе.
            </li>
            <li>
              <strong>Сайт и приложение.</strong> Один сервис: бронируйте с компьютера или телефона.
            </li>
            <li>
              <strong>Прямой контакт.</strong> Чат с владельцем помогает согласовать маршрут,
              капитана и детали выхода.
            </li>
          </ul>
        </section>

        <section className="about-page__section" aria-labelledby="about-contact">
          <h2 id="about-contact" className="about-page__h2">
            Контакты и документы
          </h2>
          <p>
            Вопросы по сервису: <a href="mailto:hello@onthewater.ru">hello@onthewater.ru</a>.
            Юридические условия опубликованы в разделах{' '}
            <Link to="/terms">Условия использования</Link> и{' '}
            <Link to="/privacy">Политика конфиденциальности</Link>.
          </p>
          <p>
            ONTHEWATER развивает аренду водной техники в России — чтобы выход на воду планировался
            спокойно, а хорошие суда находили своих гостей быстрее.
          </p>
        </section>
      </div>
    </main>
  )
}
