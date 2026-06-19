import { useEffect } from 'react'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl'
import { applyDocumentSeo } from './documentSeo'

/**
 * SEO лендинга для владельцев катеров.
 */
export function useOwnerLandingSeo() {
  useEffect(() => {
    const origin = getPublicSiteOrigin()
    const title = 'Разместить катер в аренду | ONTHEWATER для владельцев'
    const description =
      'Сдавайте катер или яхту в аренду через ONTHEWATER: размещение объявления, бронирования и выплаты в приложении для владельцев.'

    return applyDocumentSeo({
      title,
      description,
      canonicalUrl: `${origin}/owners`,
      keywords: 'сдать катер в аренду, размещение катера, аренда яхты владельцу, ONTHEWATER',
    })
  }, [])
}
