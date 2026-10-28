import { useEffect } from 'react'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl'
import { applyDocumentSeo, buildJsonLd } from './documentSeo'

const JSON_LD_ID = 'otw-jsonld-about'

/**
 * SEO страницы «О нас»: title, description, canonical, OG, AboutPage JSON-LD.
 */
export function useAboutPageSeo() {
  useEffect(() => {
    const origin = getPublicSiteOrigin()
    const canonicalUrl = `${origin}/about`
    const title = 'О нас — ONTHEWATER | Аренда катеров и яхт онлайн'
    const description =
      'ONTHEWATER — сервис аренды катеров и яхт в России: поиск на карте, онлайн-бронирование и мобильное приложение. Узнайте, как мы помогаем отдыхать на воде.'

    const revertDoc = applyDocumentSeo({
      title,
      description,
      canonicalUrl,
      ogImage: `${origin}/og-default.webp`,
      ogImageAlt: 'ONTHEWATER — аренда катеров и яхт',
      keywords:
        'о нас ONTHEWATER, аренда катеров Россия, сервис аренды яхт, приложение аренды катеров, бронирование катера онлайн',
    })

    const revertLd = buildJsonLd(JSON_LD_ID, {
      '@graph': [
        {
          '@type': 'AboutPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: title,
          description,
          isPartOf: { '@id': `${origin}/#website` },
          about: { '@id': `${origin}/#organization` },
          inLanguage: 'ru-RU',
        },
        {
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
            { '@type': 'ListItem', position: 2, name: 'О нас', item: canonicalUrl },
          ],
        },
      ],
    })

    return () => {
      revertLd()
      revertDoc()
    }
  }, [])
}
