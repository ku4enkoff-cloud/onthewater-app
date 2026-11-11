import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { API_BASE } from '../config'
import { useAuth } from './AuthContext'

const RealtimeContext = createContext({ connected: false, subscribe: () => () => {} })

/** Одно Socket.IO-соединение на вкладку; события сервера: chat:message { chat_id, message }. */
export function RealtimeProvider({ children }) {
  const { token } = useAuth()
  const [connected, setConnected] = useState(false)
  const listenersRef = useRef(new Set())

  useEffect(() => {
    if (!token || typeof window === 'undefined') {
      setConnected(false)
      return undefined
    }
    const socket = io(API_BASE || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionDelayMax: 10000,
    })
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    const onMessage = (payload) => {
      listenersRef.current.forEach((fn) => {
        try {
          fn(payload)
        } catch {
          /* ignore listener errors */
        }
      })
    }
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onDisconnect)
    socket.on('chat:message', onMessage)
    return () => {
      socket.off('chat:message', onMessage)
      socket.disconnect()
      setConnected(false)
    }
  }, [token])

  const subscribe = useCallback((fn) => {
    listenersRef.current.add(fn)
    return () => listenersRef.current.delete(fn)
  }, [])

  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

/** Подписка на новые сообщения чатов; handler всегда актуальный, переподписки не нужны. */
export function useChatMessageEvents(handler) {
  const { subscribe } = useRealtime()
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => subscribe((payload) => ref.current(payload)), [subscribe])
}
