import { NavLink } from 'react-router-dom'
import { Calendar, Heart, Home, MessageSquare, User } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useChatUnread } from '../context/ChatUnreadContext'

const TABS = [
  { to: '/', end: true, label: 'Главная', Icon: Home },
  { to: '/favorites', label: 'Избранное', Icon: Heart },
  { to: '/bookings', label: 'Брони', Icon: Calendar },
  { to: '/chats', label: 'Сообщения', Icon: MessageSquare, badge: true },
  { to: '/account', label: 'Профиль', Icon: User },
]

export default function BottomTabBar() {
  const { user } = useAuth()
  const { unread } = useChatUnread()
  const showBadge = !!user && unread > 0

  return (
    <nav className="mapp-tabs" aria-label="Основные разделы">
      {TABS.map(({ to, end, label, Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={!!end}
          aria-label={label}
          className={({ isActive }) => `mapp-tabs__btn${isActive ? ' is-active' : ''}`}
        >
          <span className="mapp-tabs__icon">
            <Icon size={22} strokeWidth={2} />
          </span>
          {badge && showBadge ? (
            <span className="mapp-tabs__badge">{unread > 99 ? '99+' : unread}</span>
          ) : null}
        </NavLink>
      ))}
    </nav>
  )
}
