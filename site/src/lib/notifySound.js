const STORAGE_KEY = 'boatrent_site_sound_enabled'

let ctx = null
let unlockInstalled = false

function getContext() {
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null
  if (!ctx) ctx = new Ctor()
  return ctx
}

/** Браузеры разрешают звук только после жеста пользователя — разблокируем AudioContext на первом клике/клавише. */
export function installSoundUnlock() {
  if (unlockInstalled || typeof window === 'undefined') return
  unlockInstalled = true
  const unlock = () => {
    const c = getContext()
    if (c && c.state === 'suspended') c.resume().catch(() => {})
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('keydown', unlock)
  }
  window.addEventListener('pointerdown', unlock)
  window.addEventListener('keydown', unlock)
}

export function isSoundEnabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) !== '0'
  } catch {
    return true
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    /* ignore */
  }
}

function tone(c, freq, start, duration, peak) {
  const osc = c.createOscillator()
  const gain = c.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(freq, start)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(peak, start + 0.015)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  osc.connect(gain).connect(c.destination)
  osc.start(start)
  osc.stop(start + duration + 0.02)
}

const PATTERNS = {
  // Сообщение: короткий восходящий «динь-дон»
  message: [
    [880, 0, 0.16],
    [1318.5, 0.11, 0.24],
  ],
  // Бронирование: три ноты мажорного аккорда — заметнее, чем сообщение
  booking: [
    [659.3, 0, 0.18],
    [830.6, 0.12, 0.18],
    [987.8, 0.24, 0.34],
  ],
}

let lastPlayedAt = 0

export function playNotifySound(kind = 'message', { force = false } = {}) {
  if (!force && !isSoundEnabled()) return
  const now = Date.now()
  if (!force && now - lastPlayedAt < 800) return
  const c = getContext()
  if (!c) return
  const play = () => {
    lastPlayedAt = Date.now()
    const t0 = c.currentTime + 0.01
    for (const [freq, offset, duration] of PATTERNS[kind] || PATTERNS.message) {
      tone(c, freq, t0 + offset, duration, 0.18)
    }
  }
  if (c.state === 'running') play()
  else if (force) c.resume().then(play).catch(() => {})
}
