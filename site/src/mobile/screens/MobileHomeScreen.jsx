import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, X } from 'lucide-react'
import { fetchPopularBoats, fetchBoatTypes } from '../../api/boats'
import { fetchDestinations } from '../../api/destinations'
import { getPhotoUrl } from '../../config'
import { useHomePageSeo } from '../../seo/useHomePageSeo'
import MobileBoatCard from '../components/MobileBoatCard.jsx'

const FALLBACK_DESTINATIONS = [
  { id: 'moscow', name: 'Москва', image: 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400' },
  { id: 'mo', name: 'Московская область', image: 'https://images.unsplash.com/photo-1513326738677-9646ab0f3b3b?w=400' },
  { id: 'spb', name: 'Санкт-Петербург', image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400' },
]

export default function MobileHomeScreen() {
  useHomePageSeo()
  const navigate = useNavigate()
  const [boats, setBoats] = useState([])
  const [destinations, setDestinations] = useState(FALLBACK_DESTINATIONS)
  const [categories, setCategories] = useState([])
  const [locOpen, setLocOpen] = useState(false)

  const load = useCallback(async () => {
    const [boatsRes, typesRes, destRes] = await Promise.allSettled([
      fetchPopularBoats(20),
      fetchBoatTypes(),
      fetchDestinations(),
    ])
    if (boatsRes.status === 'fulfilled') setBoats(boatsRes.value)
    if (typesRes.status === 'fulfilled' && typesRes.value.length) {
      setCategories(
        typesRes.value.map((t) => ({
          id: String(t.id),
          name: t.name || '—',
          image: getPhotoUrl(t.image) || 'https://placehold.co/400x300?text=',
        })),
      )
    }
    if (destRes.status === 'fulfilled' && destRes.value.length) {
      setDestinations(
        destRes.value.map((d) => ({
          id: String(d.id),
          name: d.name || '—',
          image: getPhotoUrl(d.image) || 'https://placehold.co/400x300?text=',
        })),
      )
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const goNearby = () => {
    navigate('/boats?near=1&map=1')
  }

  const goCity = (cityName) => {
    const q = new URLSearchParams({ city: cityName })
    navigate(`/boats?${q.toString()}`)
    setLocOpen(false)
  }

  const goCategory = (cat) => {
    const q = new URLSearchParams({
      type: String(cat.id),
      typeName: cat.name,
      all: '1',
    })
    navigate(`/boats?${q.toString()}`)
  }

  return (
    <div className="mapp-screen mapp-home">
      <section className="mapp-hero">
        <img className="mapp-hero__img" src="/app-hero.webp" alt="" />
        <div className="mapp-hero__gradTop" aria-hidden="true" />
        <div className="mapp-hero__gradBottom" aria-hidden="true" />
        <div className="mapp-hero__inner">
          <div>
            <h1 className="mapp-hero__title">Бронируй, катай, отдыхай</h1>
            <p className="mapp-hero__sub">
              {'Аренда катеров, прогулки с капитаном\nи незабываемые впечатления на воде.'}
            </p>
          </div>
          <div className="mapp-hero__cta">
            <button type="button" className="mapp-hero__nearby" onClick={goNearby}>
              <MapPin size={18} />
              Катера поблизости
            </button>
            <button type="button" className="mapp-hero__region" onClick={() => setLocOpen(true)}>
              Найти катер в другом регионе →
            </button>
          </div>
        </div>
      </section>

      <h2 className="mapp-sectionTitle">Популярные катера</h2>
      <div className="mapp-hscroll">
        {boats.length ? (
          boats.map((b) => <MobileBoatCard key={b.id} boat={b} horizontal />)
        ) : (
          <p className="mapp-empty" style={{ padding: '12px 0' }}>
            Загружаем катера…
          </p>
        )}
      </div>

      <h2 className="mapp-sectionTitle">Популярные направления</h2>
      <div className="mapp-hscroll">
        {destinations.map((d) => (
          <button key={d.id} type="button" className="mapp-destCard" onClick={() => goCity(d.name)}>
            <img src={d.image} alt="" loading="lazy" />
            <span>{d.name}</span>
          </button>
        ))}
      </div>

      <h2 className="mapp-sectionTitle">Категории катеров</h2>
      <div className="mapp-hscroll" style={{ paddingBottom: 24 }}>
        {categories.map((c) => (
          <button key={c.id} type="button" className="mapp-catCard" onClick={() => goCategory(c)}>
            <img src={c.image} alt="" loading="lazy" />
            <span>{c.name}</span>
          </button>
        ))}
      </div>

      {locOpen ? (
        <div className="mapp-modal" role="dialog" aria-modal="true" onClick={() => setLocOpen(false)}>
          <div className="mapp-modal__sheet" onClick={(e) => e.stopPropagation()}>
            <div className="mapp-modal__head">
              <h2>Выберите регион</h2>
              <button type="button" className="mapp-modal__close" onClick={() => setLocOpen(false)} aria-label="Закрыть">
                <X size={18} />
              </button>
            </div>
            <div className="mapp-locList">
              <button type="button" onClick={goNearby}>
                Катера поблизости
              </button>
              {destinations.map((d) => (
                <button key={`loc-${d.id}`} type="button" onClick={() => goCity(d.name)}>
                  {d.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
