import { useEffect, useRef } from 'react'

/**
 * Вызывает callback каждые intervalMs, пока вкладка видима.
 * При возврате на вкладку — сразу вызывает callback и перезапускает таймер.
 * Первый вызов при монтировании не делается: начальную загрузку выполняет вызывающий код.
 */
export function useVisiblePolling(callback, intervalMs, enabled = true) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    if (!enabled || !intervalMs) return undefined
    let timer = null

    const stop = () => {
      if (timer) clearInterval(timer)
      timer = null
    }
    const start = () => {
      stop()
      timer = setInterval(() => {
        if (document.visibilityState === 'visible') cbRef.current()
      }, intervalMs)
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        cbRef.current()
        start()
      } else {
        stop()
      }
    }

    if (document.visibilityState === 'visible') start()
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      stop()
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [intervalMs, enabled])
}
