import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { fetchUnreadMessagesCount } from '../../api/chats'

const ChatUnreadContext = createContext({ unread: 0, refreshUnread: async () => {} })

export function ChatUnreadProvider({ children }) {
  const { token, user } = useAuth()
  const [unread, setUnread] = useState(0)

  const refreshUnread = useCallback(async () => {
    if (!token || !user) {
      setUnread(0)
      return
    }
    try {
      const count = await fetchUnreadMessagesCount(token)
      setUnread(count)
    } catch {
      setUnread(0)
    }
  }, [token, user])

  useEffect(() => {
    refreshUnread()
    if (!token) return undefined
    const id = setInterval(refreshUnread, 30000)
    return () => clearInterval(id)
  }, [refreshUnread, token])

  const value = useMemo(() => ({ unread, refreshUnread }), [unread, refreshUnread])
  return <ChatUnreadContext.Provider value={value}>{children}</ChatUnreadContext.Provider>
}

export function useChatUnread() {
  return useContext(ChatUnreadContext)
}
