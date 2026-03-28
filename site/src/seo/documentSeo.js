/** Значения по умолчанию — совпадают с index.html для краулеров без JS. */
export const DEFAULT_DOCUMENT_TITLE = 'ONTHEWATER — аренда катеров'
export const DEFAULT_META_DESCRIPTION =
  'ONTHEWATER — поиск и бронирование катеров и яхт в России. Подберите судно с капитаном или без, сравните цены и оформите выход на воду через приложение.'

function setMetaName(name, content) {
  if (content == null || content === '') return () => {}
  let el = document.querySelector(`meta[name="${name}"]`)
  const created = !el
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('name', name)
    document.head.appendChild(el)
  }
  const prev = el.getAttribute('content')
  el.setAttribute('content', content)
  return () => {
    if (created) {
      el.remove()
      return
    }
    if (prev == null) el.removeAttribute('content')
    else el.setAttribute('content', prev)
  }
}

function setMetaProperty(property, content) {
  if (content == null || content === '') return () => {}
  let el = document.querySelector(`meta[property="${property}"]`)
  const created = !el
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute('property', property)
    document.head.appendChild(el)
  }
  const prev = el.getAttribute('content')
  el.setAttribute('content', content)
  return () => {
    if (created) {
      el.remove()
      return
    }
    if (prev == null) el.removeAttribute('content')
    else el.setAttribute('content', prev)
  }
}

function setLinkRel(rel, href) {
  if (!href) return () => {}
  let el = document.querySelector(`link[rel="${rel}"]`)
  const created = !el
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  const prev = el.getAttribute('href')
  el.setAttribute('href', href)
  return () => {
    if (created) {
      el.remove()
      return
    }
    if (prev == null) el.removeAttribute('href')
    else el.setAttribute('href', prev)
  }
}

function setJsonLd(id, data) {
  if (data == null) return () => {}
  const existing = document.getElementById(id)
  if (existing) existing.remove()
  const script = document.createElement('script')
  script.id = id
  script.type = 'application/ld+json'
  script.setAttribute('data-app-seo', '1')
  script.textContent = JSON.stringify(data)
  document.head.appendChild(script)
  return () => {
    script.remove()
  }
}

/**
 * Применяет title, description, canonical, Open Graph, Twitter и JSON-LD.
 * Возвращает функцию отката (восстановление предыдущего title и удаление добавленных тегов).
 */
export function applyDocumentSeo({
  title,
  description,
  canonicalUrl,
  ogTitle,
  ogDescription,
  ogImage,
  ogLocale = 'ru_RU',
  ogSiteName = 'ONTHEWATER',
  twitterCard = 'summary_large_image',
  keywords,
}) {
  const revertFns = []
  const prevTitle = document.title

  if (title) document.title = title

  if (description) revertFns.push(setMetaName('description', description))
  if (keywords) revertFns.push(setMetaName('keywords', keywords))

  if (canonicalUrl) revertFns.push(setLinkRel('canonical', canonicalUrl))

  const ogT = ogTitle || title
  const ogD = ogDescription || description
  if (ogT) revertFns.push(setMetaProperty('og:title', ogT))
  if (ogD) revertFns.push(setMetaProperty('og:description', ogD))
  if (canonicalUrl) revertFns.push(setMetaProperty('og:url', canonicalUrl))
  revertFns.push(setMetaProperty('og:type', 'website'))
  revertFns.push(setMetaProperty('og:locale', ogLocale))
  revertFns.push(setMetaProperty('og:site_name', ogSiteName))
  if (ogImage) revertFns.push(setMetaProperty('og:image', ogImage))

  if (ogT) revertFns.push(setMetaName('twitter:title', ogT))
  if (ogD) revertFns.push(setMetaName('twitter:description', ogD))
  if (ogImage) revertFns.push(setMetaName('twitter:image', ogImage))
  revertFns.push(setMetaName('twitter:card', twitterCard))

  return () => {
    document.title = prevTitle
    for (let i = revertFns.length - 1; i >= 0; i -= 1) revertFns[i]()
  }
}

export function applyHomeJsonLd(id, graph) {
  return setJsonLd(id, { '@context': 'https://schema.org', '@graph': graph })
}
