import { useEffect, useMemo, useState } from 'react'
import { CLIENT_IOS_APP_STORE_URL } from '../constants/appStores'

const STORAGE_KEY = 'otw_ios_app_prompt_dismissed_v1'

function shouldShowPrompt() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

  const ua = navigator.userAgent || ''
  const isAndroid = /Android/i.test(ua)
  if (isAndroid) return false

  const isIos =
    /iPhone|iPod/i.test(ua) ||
    (/iPad/i.test(ua) && /Mobile/i.test(ua)) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (!isIos) return false

  const isStandalone =
    (typeof window.matchMedia === 'function' &&
      window.matchMedia('(display-mode: standalone)').matches) ||
    navigator.standalone === true
  if (isStandalone) return false

  return true
}

export default function IosAppPrompt() {
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

  const openAppStore = () => {
    closeAndRemember()
    window.open(CLIENT_IOS_APP_STORE_URL, '_blank', 'noopener,noreferrer')
  }

  if (!open) return null

  return (
    <div className="androidPrompt" role="dialog" aria-modal="true" aria-labelledby="iosPromptTitle">
      <div className="androidPrompt__backdrop" onClick={closeAndRemember} />
      <div className="androidPrompt__sheet">
        <h2 id="iosPromptTitle" className="androidPrompt__title">
          Установить приложение ONTHEWATER?
        </h2>
        <p className="androidPrompt__text">
          Скачайте приложение для iPhone — удобнее искать и бронировать катера. Или продолжайте в
          мобильной версии сайта.
        </p>
        <div className="androidPrompt__actions">
          <button type="button" className="androidPrompt__btn androidPrompt__btn--ghost" onClick={closeAndRemember}>
            Продолжить в браузере
          </button>
          <button type="button" className="androidPrompt__btn androidPrompt__btn--primary" onClick={openAppStore}>
            Открыть в App Store
          </button>
        </div>
      </div>
    </div>
  )
}
