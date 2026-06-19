import { useEffect } from 'react'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl'
import { applyDocumentSeo, buildJsonLd, truncateMeta } from './documentSeo'

const JSON_LD_ID = 'seo-jsonld-boats-search'

/**
 * SEO страницы поиска катеров.
 * @param {{ locationKey: string, boatCount: number, loading: boolean }} params
 */
export function useBoatsSearchPageSeo({ locationKey, boatCount, loading }) {
  useEffect(() => {
    const origin = getPublicSiteOrigin()
    const isAllRegions = locationKey === '__all'
    const city = isAllRegions ? '' : String(locationKey || '').trim()

    const pageTitle = city
      ? `Аренда катеров в ${city} | ONTHEWATER`
      : 'Аренда катеров и яхт в России | ONTHEWATER'

    const countPart =
      !loading && boatCount > 0
        ? `${boatCount} ${boatCount === 1 ? 'катер' : boatCount < 5 ? 'катера' : 'катеров'}`
        : null
    const description = truncateMeta(
      city
        ? [
            countPart ? `${countPart} для аренды в ${city}.` : `Поиск и бронирование катеров в ${city}.`,
            'С капитаном или без, фильтры по цене и вместимости.',
            'ONTHEWATER.',
          ].join(' ')
        : [
            countPart ? `${countPart} по всей России.` : 'Каталог катеров и яхт по России.',
            'Сравните цены, выберите дату и забронируйте онлайн.',
            'ONTHEWATER.',
          ].join(' '),
    )

    const canonicalUrl = city
      ? `${origin}/boats?city=${encodeURIComponent(city)}`
      : `${origin}/boats`

    const breadcrumbItems = [
      { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: 'Катера', item: `${origin}/boats` },
    ]
    if (city) {
      breadcrumbItems.push({
        '@type': 'ListItem',
        position: 3,
        name: city,
        item: canonicalUrl,
      })
    }

    const revertDoc = applyDocumentSeo({
      title: pageTitle,
      description,
      canonicalUrl,
      keywords: city
        ? `аренда катера ${city}, катер с капитаном ${city}, прогулка на катере, ONTHEWATER`
        : 'аренда катера, аренда яхты, каталог катеров, ONTHEWATER',
    })

    const revertLd = buildJsonLd(JSON_LD_ID, {
      '@graph': [{ '@type': 'BreadcrumbList', itemListElement: breadcrumbItems }],
    })

    return () => {
      revertLd()
      revertDoc()
    }
  }, [locationKey, boatCount, loading])
}
