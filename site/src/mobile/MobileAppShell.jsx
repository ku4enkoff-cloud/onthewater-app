import { Outlet, useLocation } from 'react-router-dom'
import BottomTabBar from './components/BottomTabBar.jsx'
import { ChatUnreadProvider } from './context/ChatUnreadContext.jsx'
import './theme.css'
import './screens.css'

const TAB_PATHS = new Set(['/', '/favorites', '/bookings', '/chats', '/account'])

function showTabsForPath(pathname) {
  if (TAB_PATHS.has(pathname)) return true
  return false
}

export default function MobileAppShell() {
  const { pathname } = useLocation()
  const showTabs = showTabsForPath(pathname)

  return (
    <ChatUnreadProvider>
      <div className="mapp mapp-shell">
        <div className={`mapp-shell__body${showTabs ? '' : ' mapp-shell__body--noTabs'}`}>
          <Outlet />
        </div>
        {showTabs ? <BottomTabBar /> : null}
      </div>
    </ChatUnreadProvider>
  )
}
