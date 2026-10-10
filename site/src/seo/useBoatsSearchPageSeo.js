import { useEffect } from 'react'
import { boatDetailPath } from '../boatUrl'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl'
import { applyDocumentSeo, buildJsonLd, truncateMeta } from './documentSeo'

const JSON_LD_ID = 'seo-jsonld-boats-search'

/**
 * SEO страницы поиска катеров.
 * @param {{ locationKey: string, boatCount: number, loading: boolean, boats?: Array }} params
 */
export function useBoatsSearchPageSeo({ locationKey, boatCount, loading, boats = [] }) {
  useEffect(() => {
    const origin = getPublicSiteOrigin()
    const isAllRegions = locationKey === '__all'
    const city = isAllRegions ? '' : String(locationKey || '').trim()

    const pageTitle = city
      ? `Аренда катеров в ${city} — цены и бронирование | ONTHEWATER`
      : 'Аренда катеров и яхт в России — каталог | ONTHEWATER'

    const countPart =
      !loading && boatCount > 0
        ? `${boatCount} ${boatCount === 1 ? 'катер' : boatCount < 5 ? 'катера' : 'катеров'}`
        : null
    const description = truncateMeta(
      city
        ? [
            countPart ? `${countPart} для аренды в ${city}.` : `Поиск и бронирование катеров в ${city}.`,
            'С капитаном или без, фильтры по цене и вместимости.',
            'Сравните объявления и забронируйте на ONTHEWATER.',
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

    const listBoats = Array.isArray(boats) ? boats.slice(0, 20) : []
    const itemList =
      listBoats.length > 0
        ? {
            '@type': 'ItemList',
            name: city ? `Катера в ${city}` : 'Катера ONTHEWATER',
            numberOfItems: boatCount || listBoats.length,
            itemListElement: listBoats.map((boat, index) => ({
              '@type': 'ListItem',
              position: index + 1,
              url: `${origin}${boatDetailPath(boat)}`,
              name: boat.title || boat.type_name || 'Катер',
            })),
          }
        : null

    const collectionPage = {
      '@type': 'CollectionPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: pageTitle,
      description,
      isPartOf: { '@id': `${origin}/#website` },
      inLanguage: 'ru-RU',
    }

    const revertDoc = applyDocumentSeo({
      title: pageTitle,
      description,
      canonicalUrl,
      keywords: city
        ? `аренда катера ${city}, катер с капитаном ${city}, прогулка на катере ${city}, ONTHEWATER`
        : 'аренда катера, аренда яхты, каталог катеров, бронирование катера, ONTHEWATER',
    })

    const graph = [
      collectionPage,
      { '@type': 'BreadcrumbList', itemListElement: breadcrumbItems },
    ]
    if (itemList) graph.push(itemList)

    const revertLd = buildJsonLd(JSON_LD_ID, { '@graph': graph })

    return () => {
      revertLd()
      revertDoc()
    }
  }, [locationKey, boatCount, loading, boats])
}
