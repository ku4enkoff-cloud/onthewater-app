import { useEffect, useState } from 'react'

const QUERY = '(max-width: 768px)'

/**
 * Viewport ≤768px → оболочка как в клиентском приложении.
 * SSR/первая отрисовка: false, затем синхронизация (десктоп не мигает app-UI).
 */
export function useIsMobileApp() {
  const [isMobileApp, setIsMobileApp] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mql = window.matchMedia(QUERY)
    const apply = () => setIsMobileApp(!!mql.matches)
    apply()
    mql.addEventListener('change', apply)
    return () => mql.removeEventListener('change', apply)
  }, [])

  return isMobileApp
}
