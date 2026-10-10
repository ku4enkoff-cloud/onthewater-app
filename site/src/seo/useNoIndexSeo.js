import { useEffect } from 'react'
import { applyDocumentSeo } from './documentSeo'

/**
 * Закрывает страницу от индексации (личный кабинет, вход, регистрация).
 * @param {string} title
 */
export function useNoIndexSeo(title) {
  useEffect(() => {
    return applyDocumentSeo({
      title: title || 'ONTHEWATER',
      description: 'Служебная страница ONTHEWATER — не для индексации.',
      robots: 'noindex, nofollow',
    })
  }, [title])
}
