import { useEffect } from 'react'
import { boatDetailPath } from '../boatUrl'
import { getPhotoUrl } from '../config'
import { firstPhotoUrl, formatCardLocation, formatGuestLabelRu, formatPriceRu, getMinDurationPrice } from '../boatUtils'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl'
import { applyDocumentSeo, buildJsonLd, truncateMeta } from './documentSeo'

const JSON_LD_ID = 'seo-jsonld-boat-detail'

/**
 * SEO карточки катера: title, description, canonical, OG, Product + BreadcrumbList.
 * @param {object|null} boat
 */
export function useBoatDetailPageSeo(boat) {
  useEffect(() => {
    if (!boat) return undefined

    const origin = getPublicSiteOrigin()
    const title = boat.title || boat.type_name || 'Катер'
    const city = String(boat.location_city || boat.locationCity || '').trim()
    const loc = formatCardLocation(boat)
    const pageTitle = city
      ? `${title} — аренда в ${city} | ONTHEWATER`
      : `${title} — аренда катера | ONTHEWATER`

    const price = getMinDurationPrice(boat)
    const capacity = boat.capacity != null ? Number(boat.capacity) : null
    const captain = boat.captain_included !== false
    const rawDesc = String(boat.description || '').trim()
    const fallbackDesc = [
      `Аренда «${title}»${loc && loc !== '—' ? ` в ${loc}` : ''}.`,
      price > 0 ? `Цена от ${formatPriceRu(price)} ₽.` : null,
      capacity ? `До ${formatGuestLabelRu(capacity)}.` : null,
      captain ? 'Капитан включён.' : 'Аренда без капитана.',
      'Бронирование на ONTHEWATER.',
    ]
      .filter(Boolean)
      .join(' ')
    const description = truncateMeta(rawDesc || fallbackDesc)

    const path = boatDetailPath(boat)
    const canonicalUrl = `${origin}${path}`
    const photo = firstPhotoUrl(boat, getPhotoUrl)
    const ogImage = photo && (photo.startsWith('http') ? photo : `${origin}${photo.startsWith('/') ? '' : '/'}${photo}`)

    const boatsSearchUrl = city
      ? `${origin}/boats?city=${encodeURIComponent(city)}`
      : `${origin}/boats`

    const breadcrumb = {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Главная', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: 'Катера', item: `${origin}/boats` },
        ...(city
          ? [{ '@type': 'ListItem', position: 3, name: city, item: boatsSearchUrl }]
          : []),
        {
          '@type': 'ListItem',
          position: city ? 4 : 3,
          name: title,
          item: canonicalUrl,
        },
      ],
    }

    const product = {
      '@type': 'Product',
      name: title,
      description,
      ...(ogImage ? { image: ogImage } : {}),
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'RUB',
        ...(price > 0 ? { price: String(price) } : {}),
        availability: 'https://schema.org/InStock',
      },
    }

    const revertDoc = applyDocumentSeo({
      title: pageTitle,
      description,
      canonicalUrl,
      ogImage,
      keywords: `аренда катера, ${title}, ${city || loc}, ONTHEWATER`,
    })

    const revertLd = buildJsonLd(JSON_LD_ID, { '@graph': [breadcrumb, product] })

    return () => {
      revertLd()
      revertDoc()
    }
  }, [boat])
}
