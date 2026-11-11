import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { API_BASE } from '../config'
import { installSoundUnlock, playNotifySound } from '../lib/notifySound'
import { useAuth } from './AuthContext'

const EVENTS = ['chat:message', 'booking:updated']

const RealtimeContext = createContext({ connected: false, subscribe: () => () => {} })

/**
 * Одно Socket.IO-соединение на вкладку. События сервера:
 * chat:message { chat_id, message }, booking:updated { booking_id, title, body, quiet }.
 */
export function RealtimeProvider({ children }) {
  const { token, user } = useAuth()
  const [connected, setConnected] = useState(false)
  const listenersRef = useRef(new Map())
  const roleRef = useRef(user?.role)
  roleRef.current = user?.role

  useEffect(() => {
    installSoundUnlock()
  }, [])

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
    const dispatch = (event) => (payload) => {
      if (event === 'chat:message') {
        const m = payload?.message
        const mine = roleRef.current === 'owner' ? m?.sender === 'owner' : m?.is_own === true || m?.sender === 'me'
        if (m && !mine) playNotifySound('message')
      } else if (event === 'booking:updated' && !payload?.quiet) {
        playNotifySound('booking')
      }
      listenersRef.current.get(event)?.forEach((fn) => {
        try {
          fn(payload)
        } catch {
          /* ignore listener errors */
        }
      })
    }
    const handlers = EVENTS.map((event) => [event, dispatch(event)])
    const onConnect = () => setConnected(true)
    const onDisconnect = () => setConnected(false)
    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onDisconnect)
    handlers.forEach(([event, fn]) => socket.on(event, fn))
    return () => {
      handlers.forEach(([event, fn]) => socket.off(event, fn))
      socket.disconnect()
      setConnected(false)
    }
  }, [token])

  const subscribe = useCallback((event, fn) => {
    const map = listenersRef.current
    if (!map.has(event)) map.set(event, new Set())
    map.get(event).add(fn)
    return () => map.get(event)?.delete(fn)
  }, [])

  const value = useMemo(() => ({ connected, subscribe }), [connected, subscribe])
  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

export function useRealtime() {
  return useContext(RealtimeContext)
}

/** Подписка на событие сервера; handler всегда актуальный, переподписки не нужны. */
export function useRealtimeEvent(event, handler) {
  const { subscribe } = useRealtime()
  const ref = useRef(handler)
  ref.current = handler
  useEffect(() => subscribe(event, (payload) => ref.current(payload)), [subscribe, event])
}

export function useChatMessageEvents(handler) {
  useRealtimeEvent('chat:message', handler)
}

export function useBookingEvents(handler) {
  useRealtimeEvent('booking:updated', handler)
}
