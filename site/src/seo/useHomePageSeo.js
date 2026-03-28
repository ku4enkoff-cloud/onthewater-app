import { useEffect } from 'react'
import { SITE_MAIN_URL } from '../config'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl'
import { applyDocumentSeo, applyHomeJsonLd } from './documentSeo'

const JSON_LD_ID = 'seo-jsonld-home'

/**
 * SEO главной: title, description, canonical, OG/Twitter, WebSite + Organization + SearchAction.
 * @param {string} heroImageUrl — путь из import (например /assets/hero-….webp) для og:image
 */
export function useHomePageSeo(heroImageUrl) {
  useEffect(() => {
    const origin = getPublicSiteOrigin()
    const canonicalUrl = `${origin}/`

    const title = 'Аренда катеров и яхт для отдыха на воде | ONTHEWATER'
    const description =
      'Найдите и забронируйте катер или яхту в России: с капитаном или без, популярные направления, прозрачные цены. Бронирование в приложении ONTHEWATER.'

    const ogImage =
      heroImageUrl && (heroImageUrl.startsWith('http') ? heroImageUrl : `${origin}${heroImageUrl.startsWith('/') ? '' : '/'}${heroImageUrl}`)

    const sameAs = SITE_MAIN_URL.replace(/\/$/, '')
    const jsonGraph = [
      {
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        name: 'ONTHEWATER',
        url: origin,
        logo: `${origin}/favicon.svg`,
        sameAs: [sameAs],
      },
      {
        '@type': 'WebSite',
        '@id': `${origin}/#website`,
        url: origin,
        name: 'ONTHEWATER',
        description,
        inLanguage: 'ru-RU',
        publisher: { '@id': `${origin}/#organization` },
        potentialAction: {
          '@type': 'SearchAction',
          target: {
            '@type': 'EntryPoint',
            urlTemplate: `${origin}/boats?city={search_term_string}`,
          },
          'query-input': 'required name=search_term_string',
        },
      },
    ]

    const revertDoc = applyDocumentSeo({
      title,
      description,
      canonicalUrl,
      ogImage,
      keywords:
        'аренда катера, аренда яхты, катер с капитаном, прогулка на катере, бронирование катера, ONTHEWATER',
    })

    const revertLd = applyHomeJsonLd(JSON_LD_ID, jsonGraph)

    return () => {
      revertLd()
      revertDoc()
    }
  }, [heroImageUrl])
}
