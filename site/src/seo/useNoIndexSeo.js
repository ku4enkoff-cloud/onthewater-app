import { useEffect } from 'react'
import { applyDocumentSeo } from './documentSeo'

/**
 * Закрывает страницу от индексации (личный кабинет, вход, регистрация).
 * @param {string} title
 */
export function useNoIndexSeo(title) {
  useEffect(() => {
    return applyDocumentSeo({
      title,
      robots: 'noindex, nofollow',
    })
  }, [title])
}
