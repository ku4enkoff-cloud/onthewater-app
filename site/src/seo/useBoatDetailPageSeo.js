import { useEffect } from 'react'
import { boatDetailPath } from '../boatUrl'
import { getPhotoUrl } from '../config'
import {
  firstPhotoUrl,
  formatCardLocation,
  formatGuestLabelRu,
  formatPriceRu,
  getMinDurationPrice,
} from '../boatUtils'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl'
import { applyDocumentSeo, buildJsonLd, truncateMeta } from './documentSeo'

const JSON_LD_ID = 'seo-jsonld-boat-detail'

/**
 * SEO карточки катера: title, description, canonical, OG, Product + BreadcrumbList + Place.
 * @param {object|null} boat
 */
export function useBoatDetailPageSeo(boat) {
  useEffect(() => {
    if (!boat) return undefined

    const origin = getPublicSiteOrigin()
    const title = boat.title || boat.type_name || 'Катер'
    const city = String(boat.location_city || boat.locationCity || '').trim()
    const region = String(boat.location_region || boat.locationRegion || '').trim()
    const loc = formatCardLocation(boat)
    const typeName = String(boat.type_name || boat.type || '').trim()
    const safeTitle = city
      ? `${title} — аренда в ${city} | ONTHEWATER`
      : `${title} — аренда катера | ONTHEWATER`

    const price = getMinDurationPrice(boat)
    const capacity = boat.capacity != null ? Number(boat.capacity) : null
    const captain = boat.captain_included !== false
    const rawDesc = String(boat.description || '').trim()
    const fallbackDesc = [
      `Аренда «${title}»${loc && loc !== '—' ? ` в ${loc}` : ''}.`,
      typeName ? `Тип: ${typeName}.` : null,
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
    const ogImage =
      photo && (photo.startsWith('http') ? photo : `${origin}${photo.startsWith('/') ? '' : '/'}${photo}`)

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

    const rating = Number(boat.rating)
    const reviewsCount = Number(boat.reviews_count) || 0
    const lat = Number(boat.lat)
    const lng = Number(boat.lng)

    const product = {
      '@type': 'Product',
      '@id': `${canonicalUrl}#product`,
      name: title,
      description,
      category: typeName || 'Аренда катера',
      ...(ogImage ? { image: [ogImage] } : {}),
      brand: {
        '@type': 'Brand',
        name: 'ONTHEWATER',
      },
      offers: {
        '@type': 'Offer',
        url: canonicalUrl,
        priceCurrency: 'RUB',
        ...(price > 0 ? { price: String(Math.round(price)) } : {}),
        availability: 'https://schema.org/InStock',
        itemCondition: 'https://schema.org/UsedCondition',
      },
      ...(rating > 0 && reviewsCount > 0
        ? {
            aggregateRating: {
              '@type': 'AggregateRating',
              ratingValue: String(rating),
              reviewCount: String(reviewsCount),
              bestRating: '5',
              worstRating: '1',
            },
          }
        : {}),
    }

    const place =
      (city || region || (Number.isFinite(lat) && Number.isFinite(lng))) && {
        '@type': 'Place',
        '@id': `${canonicalUrl}#place`,
        name: loc !== '—' ? loc : title,
        ...(city || region
          ? {
              address: {
                '@type': 'PostalAddress',
                addressLocality: city || undefined,
                addressRegion: region || undefined,
                addressCountry: 'RU',
              },
            }
          : {}),
        ...(Number.isFinite(lat) && Number.isFinite(lng)
          ? { geo: { '@type': 'GeoCoordinates', latitude: lat, longitude: lng } }
          : {}),
      }

    const webPage = {
      '@type': 'WebPage',
      '@id': `${canonicalUrl}#webpage`,
      url: canonicalUrl,
      name: safeTitle,
      description,
      isPartOf: { '@id': `${origin}/#website` },
      about: { '@id': `${canonicalUrl}#product` },
      inLanguage: 'ru-RU',
    }

    const revertDoc = applyDocumentSeo({
      title: safeTitle,
      description,
      canonicalUrl,
      ogImage,
      ogImageAlt: title,
      ogType: 'product',
      keywords: [
        'аренда катера',
        title,
        typeName,
        city,
        region,
        captain ? 'с капитаном' : 'без капитана',
        'ONTHEWATER',
      ]
        .filter(Boolean)
        .join(', '),
    })

    const graph = [webPage, breadcrumb, product]
    if (place) graph.push(place)

    const revertLd = buildJsonLd(JSON_LD_ID, { '@graph': graph })

    return () => {
      revertLd()
      revertDoc()
    }
  }, [boat])
}
