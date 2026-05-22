import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchLegalDocument } from '../api/legalDocuments.js'
import { legalBodyToHtml } from '../lib/legalBody.js'
import { applyDocumentSeo } from '../seo/documentSeo.js'
import { getPublicSiteOrigin } from '../lib/publicSiteUrl.js'

export default function LegalDocumentPage({ slug, defaultTitle, pathForCanonical }) {
  const [title, setTitle] = useState(defaultTitle || 'Документ')
  const [bodyHtml, setBodyHtml] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!slug) {
      setError('Не указан документ')
      setLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchLegalDocument(slug)
        if (cancelled) return
        if (data?.title) setTitle(data.title)
        setBodyHtml(legalBodyToHtml(typeof data?.body === 'string' ? data.body : ''))
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Не удалось загрузить документ')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [slug])

  useEffect(() => {
    const origin = getPublicSiteOrigin()
    const path = pathForCanonical || '/'
    return applyDocumentSeo({
      title: `${title} — ONTHEWATER`,
      description: `${title} сервиса ONTHEWATER.`,
      canonicalUrl: `${origin}${path}`,
    })
  }, [title, pathForCanonical])

  return (
    <>
      <header className="bd-topBar auth-loginTopBar">
        <div className="bd-topBar__left">
          <Link to="/" className="bd-topBar__logo" aria-label="ONTHEWATER — на главную">
            <span className="bd-topBar__logoMark" aria-hidden />
            <span className="bd-topBar__logoText">onthewater</span>
          </Link>
        </div>
        <nav className="bd-topBar__nav" aria-label="Разделы сайта">
          <Link to="/boats" className="bd-topBar__link">
            Поиск катеров
          </Link>
          <Link to="/" className="bd-topBar__link">
            На главную
          </Link>
        </nav>
      </header>

      <main className="legal-page">
        <article className="legal-page__inner">
          <h1 className="legal-page__title">{title}</h1>
          {loading && <p className="legal-page__status">Загружаем…</p>}
          {!loading && error && (
            <p className="legal-page__error">
              {error}.{' '}
              <Link to="/">Вернуться на главную</Link>
            </p>
          )}
          {!loading && !error && (
            <div
              className="legal-page__body"
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />
          )}
        </article>
      </main>
    </>
  )
}
