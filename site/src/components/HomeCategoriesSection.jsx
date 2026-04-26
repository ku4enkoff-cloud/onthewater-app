import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchBoatTypes } from '../api/boats'
import { getPhotoUrl } from '../config'

const FALLBACK_IMAGE = 'https://placehold.co/900x600/e2e8f0/334155?text=%D0%A2%D0%B8%D0%BF+%D1%81%D1%83%D0%B4%D0%BD%D0%B0'

export default function HomeCategoriesSection() {
  const [types, setTypes] = useState([])

  useEffect(() => {
    let cancelled = false
    fetchBoatTypes()
      .then((res) => {
        if (cancelled) return
        const normalized = Array.isArray(res)
          ? res
              .map((t) => ({
                id: String(t?.id ?? ''),
                name: String(t?.name || '').trim(),
                image: getPhotoUrl(t?.image) || FALLBACK_IMAGE,
              }))
              .filter((t) => t.id && t.name)
          : []
        setTypes(normalized)
      })
      .catch(() => {
        if (!cancelled) setTypes([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (types.length === 0) return null

  return (
    <section className="lp-section lp-cats" aria-label="Категории судов">
      <div className="lp-container">
        <div className="lp-catsLayout">
          <header className="lp-catsHead">
            <h2 className="lp-catsTitle">Категории</h2>
          </header>

          <div className="lp-catsRail" role="region" aria-label="Прокрутка категорий">
            <div className="lp-catsGrid">
              {types.map((type) => (
                <Link
                  key={type.id}
                  to="/boats"
                  className="lp-catCard"
                  aria-label={`Перейти к поиску катеров: ${type.name}`}
                >
                  <img src={type.image} alt={type.name} className="lp-catCard__img" loading="lazy" decoding="async" />
                  <span className="lp-catCard__name">{type.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
