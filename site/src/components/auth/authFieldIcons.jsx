export function FieldIconUser() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="M4.5 19.5c1.5-3 4-4.5 7.5-4.5s6 1.5 7.5 4.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function FieldIconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.5" y="5.5" width="17" height="13" rx="2" stroke="currentColor" strokeWidth="1.7" />
      <path
        d="m4.5 7.5 7.5 6 7.5-6"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FieldIconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M8.2 4.8h2.1l1 4.2-1.6 1a11.5 11.5 0 0 0 4.3 4.3l1-1.6 4.2 1v2.1a1.6 1.6 0 0 1-1.7 1.6A13.8 13.8 0 0 1 4.6 6.5 1.6 1.6 0 0 1 6.2 4.8Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function FieldIconEye({ crossed = false }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      {crossed ? (
        <>
          <path
            d="M3 3l18 18M10.6 10.6A3 3 0 0 0 13.4 13.4"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
          <path
            d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5.2 0 8.8 4.2 9.8 7-.4 1.1-1.2 2.5-2.4 3.7M6.1 6.1C4.5 7.4 3.4 9 2.9 12c1 2.8 4.6 7 9.1 7 1.4 0 2.7-.3 3.9-.9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
          />
        </>
      ) : (
        <>
          <path
            d="M2.9 12c1-2.8 4.6-7 9.1-7s8.1 4.2 9.1 7c-1 2.8-4.6 7-9.1 7s-8.1-4.2-9.1-7Z"
            stroke="currentColor"
            strokeWidth="1.7"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.7" />
        </>
      )}
    </svg>
  )
}
