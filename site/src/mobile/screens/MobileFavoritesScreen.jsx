import { useEffect, useState } from 'react'
import { fetchBoatById } from '../../api/boats'
import { useFavorites } from '../../context/FavoritesContext'
import { useNoIndexSeo } from '../../seo/useNoIndexSeo'
import MobileBoatCard from '../components/MobileBoatCard.jsx'

export default function MobileFavoritesScreen() {
  useNoIndexSeo('Избранное | ONTHEWATER')
  const { favoriteBoats } = useFavorites()
  const [hydrated, setHydrated] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      const next = await Promise.all(
        favoriteBoats.map(async (b) => {
          if (b?.title || b?.photos) return b
          try {
            const full = await fetchBoatById(b.id)
            return full || b
          } catch {
            return b
          }
        }),
      )
      if (!cancelled) {
        setHydrated(next.filter(Boolean))
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [favoriteBoats])

  return (
    <div className="mapp-screen">
      <header className="mapp-screen__header">
        <h1 className="mapp-screen__title">Избранное</h1>
      </header>
      {loading ? (
        <p className="mapp-empty">Загружаем…</p>
      ) : hydrated.length === 0 ? (
        <p className="mapp-empty">Пока нет избранных катеров. Добавляйте сердечком на карточке.</p>
      ) : (
        <div className="mapp-list">
          {hydrated.map((boat) => (
            <MobileBoatCard key={boat.id} boat={boat} />
          ))}
        </div>
      )}
    </div>
  )
}
