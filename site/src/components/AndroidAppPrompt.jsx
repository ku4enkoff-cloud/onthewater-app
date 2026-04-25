import { useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'otw_android_app_prompt_dismissed_v1'
const ANDROID_APP_URL = 'https://play.google.com/store/apps/details?id=com.anonymous.onthewater'

function shouldShowPrompt() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  const isAndroid = /Android/i.test(ua)
  const isMobile = /Mobile|Mobi/i.test(ua)
  if (!isAndroid || !isMobile) return false

  const openedFromAndroidApp = document.referrer.startsWith('android-app://')
  if (openedFromAndroidApp) return false

  const isStandalone =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    navigator.standalone === true
  if (isStandalone) return false

  return true
}

export default function AndroidAppPrompt() {
  const [open, setOpen] = useState(false)
  const canShow = useMemo(() => shouldShowPrompt(), [])

  useEffect(() => {
    if (!canShow) return
    try {
      const dismissed = window.localStorage.getItem(STORAGE_KEY) === '1'
      if (!dismissed) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [canShow])

  const closeAndRemember = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  const openGooglePlay = () => {
    closeAndRemember()
    window.open(ANDROID_APP_URL, '_blank', 'noopener,noreferrer')
  }

  if (!open) return null

  return (
    <div className="androidPrompt" role="dialog" aria-modal="true" aria-labelledby="androidPromptTitle">
      <div className="androidPrompt__backdrop" onClick={closeAndRemember} />
      <div className="androidPrompt__sheet">
        <h2 id="androidPromptTitle" className="androidPrompt__title">
          Установить приложение ONTHEWATER?
        </h2>
        <p className="androidPrompt__text">
          Откройте Android-приложение для более удобного бронирования или продолжайте в мобильной версии
          сайта.
        </p>
        <div className="androidPrompt__actions">
          <button type="button" className="androidPrompt__btn androidPrompt__btn--ghost" onClick={closeAndRemember}>
            Продолжить в браузере
          </button>
          <button type="button" className="androidPrompt__btn androidPrompt__btn--primary" onClick={openGooglePlay}>
            Скачать приложение
          </button>
        </div>
      </div>
    </div>
  )
}
