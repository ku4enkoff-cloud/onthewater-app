const STROKE = '#0f172a'

function IconLength() {
  return (
    <svg className="bd-specStrip__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M7 17V7M17 17V7" stroke={STROKE} strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M9 12h6M9 12l-1.5-1.5M9 12l-1.5 1.5M15 12l1.5-1.5M15 12l1.5 1.5"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconPerson() {
  return (
    <svg className="bd-specStrip__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM5 20v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconCaptain() {
  return (
    <svg className="bd-specStrip__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 16l1.5-9h11L19 16M5 16h14M9 16v3M15 16v3M8 10l8-2"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function IconChat() {
  return (
    <svg className="bd-specStrip__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8 10h.01M12 10h.01M16 10h.01M5 18l1.5-3H19a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v8a1 1 0 0 0 1.7.7L5 18z"
        stroke={STROKE}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function captainCopy(boat) {
  if (boat.captain_included) {
    return {
      title: 'С капитаном',
      sub: 'Аренда только с капитаном',
    }
  }
  if (boat.has_captain_option) {
    return {
      title: 'Капитан по запросу',
      sub: 'Капитана можно заказать отдельно при бронировании.',
    }
  }
  return {
    title: 'Без капитана',
    sub: 'Аренда без капитана — при наличии прав на управление.',
  }
}

/**
 * Полоса характеристик под заголовком (дизайн: иконка → значение → подпись, разделители между колонками).
 */
export default function BoatHeroSpecStrip({ lengthStr, capacity, boat, responseRate }) {
  const cap = captainCopy(boat)
  const showResponse = responseRate != null

  return (
    <div className={`bd-specStrip${showResponse ? '' : ' bd-specStrip--3'}`} role="list">
      <div className="bd-specStrip__cell" role="listitem">
        <IconLength />
        <span className="bd-specStrip__title">{lengthStr}</span>
        <span className="bd-specStrip__sub">Длина</span>
      </div>
      <div className="bd-specStrip__cell" role="listitem">
        <IconPerson />
        <span className="bd-specStrip__title">до {capacity}</span>
        <span className="bd-specStrip__sub">Гости</span>
      </div>
      <div className="bd-specStrip__cell bd-specStrip__cell--wide" role="listitem">
        <IconCaptain />
        <span className="bd-specStrip__title">{cap.title}</span>
        <span className="bd-specStrip__sub">{cap.sub}</span>
      </div>
      {showResponse ? (
        <div className="bd-specStrip__cell" role="listitem">
          <IconChat />
          <span className="bd-specStrip__title">{responseRate}%</span>
          <span className="bd-specStrip__sub">Уровень сервиса</span>
        </div>
      ) : null}
    </div>
  )
}
