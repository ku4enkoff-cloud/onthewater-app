/**
 * Та же логика, что в mobile/src/client/screens/BoatDetailScreen.js
 * (слоты, расписание, пересечение с busy).
 *
 * Шаг старта берём из карточки катера: schedule_min_duration === 30 → 30 мин,
 * иначе (60+) → 1 час.
 */

const TIME_SLOTS = []
for (let h = 6; h <= 23; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`)
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`)
}
export { TIME_SLOTS }

export function slotToMinutes(slot) {
  const [h, m] = String(slot).split(':').map(Number)
  return h * 60 + m
}

/** Шаг слотов старта по API: schedule_min_duration (30 → полчаса, 60+ → час). */
export function getBookingSlotStepMinutes(boat) {
  const raw = boat?.schedule_min_duration
  const n = raw != null && raw !== '' ? Number(raw) : NaN
  const min = Number.isFinite(n) && n > 0 ? Math.round(n) : 60
  return min < 60 ? 30 : 60
}

export function filterSlotsByStep(slots, stepMinutes) {
  const step = Number(stepMinutes) || 60
  if (step <= 0) return Array.isArray(slots) ? slots : []
  return (slots || []).filter((slot) => {
    const m = slotToMinutes(slot)
    return Number.isFinite(m) && m % step === 0
  })
}

/** Утро < 12:00, день 12:00–16:59, вечер ≥ 17:00 */
export function daypartForSlot(slot) {
  const m = slotToMinutes(slot)
  if (!Number.isFinite(m)) return 'day'
  if (m < 12 * 60) return 'morning'
  if (m < 17 * 60) return 'day'
  return 'evening'
}

const DAYPART_META = [
  { id: 'morning', label: 'Утро' },
  { id: 'day', label: 'День' },
  { id: 'evening', label: 'Вечер' },
]

/** Группы слотов для UI: только непустые части суток. */
export function groupSlotsByDaypart(slots) {
  const buckets = { morning: [], day: [], evening: [] }
  for (const slot of slots || []) {
    buckets[daypartForSlot(slot)].push(slot)
  }
  return DAYPART_META.map((meta) => ({ ...meta, slots: buckets[meta.id] })).filter(
    (g) => g.slots.length > 0,
  )
}

export function isSlotInBusyInterval(slot, busyIntervals = []) {
  if (!Array.isArray(busyIntervals) || !slot) return false
  return busyIntervals.some((b) => {
    if (!b?.start || !b?.end) return false
    const t = slotToMinutes(slot)
    const start = slotToMinutes(b.start)
    const end = slotToMinutes(b.end)
    return t >= start && t < end
  })
}

export function isStartTimeValid(slot, durationMin, busyIntervals = []) {
  if (isSlotInBusyInterval(slot, busyIntervals)) return false
  const startMin = slotToMinutes(slot)
  const endMin = startMin + (Number(durationMin) || 0)
  if (!Array.isArray(busyIntervals) || busyIntervals.length === 0) return true
  return busyIntervals.every((b) => {
    if (!b?.start || !b?.end) return true
    const bStart = slotToMinutes(b.start)
    const bEnd = slotToMinutes(b.end)
    return endMin <= bStart || startMin >= bEnd
  })
}

function parseDateKeyToLocalDate(iso) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return null
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  return Number.isNaN(dt.getTime()) ? null : dt
}

/** Доступные стартовые слоты по графику работы и длительности (конец сессии не позже endStr). */
export function getAvailableTimeSlotsBySchedule(boat, dateKeyOrDate, durationMin) {
  let startStr = '09:00'
  let endStr = '20:00'
  const d =
    typeof dateKeyOrDate === 'string' ? parseDateKeyToLocalDate(dateKeyOrDate) : dateKeyOrDate
  if (!boat) {
    return TIME_SLOTS.filter((slot) => {
      const sm = slotToMinutes(slot)
      return sm >= slotToMinutes(startStr) && sm <= slotToMinutes(endStr) - (Number(durationMin) || 60)
    })
  }
  if (boat.schedule_weekday_hours || boat.schedule_weekend_hours) {
    let sh = boat.schedule_weekday_hours
    if (typeof sh === 'string') {
      try {
        sh = JSON.parse(sh)
      } catch {
        sh = null
      }
    }
    let weh = boat.schedule_weekend_hours
    if (typeof weh === 'string') {
      try {
        weh = JSON.parse(weh)
      } catch {
        weh = null
      }
    }
    const isWeekend = d && (d.getDay() === 0 || d.getDay() === 6)
    const schedule = isWeekend ? (weh && typeof weh === 'object' ? weh : sh) : sh && typeof sh === 'object' ? sh : weh
    if (schedule && schedule.start) startStr = schedule.start
    if (schedule && schedule.end) endStr = schedule.end
  }
  const startMin = slotToMinutes(startStr)
  const endMin = slotToMinutes(endStr)
  const dur = Number(durationMin) || 60
  const latestStartMin = endMin - dur
  const step = getBookingSlotStepMinutes(boat)
  return TIME_SLOTS.filter((slot) => {
    const slotMin = slotToMinutes(slot)
    if (slotMin % step !== 0) return false
    return slotMin >= startMin && slotMin <= latestStartMin
  })
}

export function toLocalDateKey(d) {
  if (!d) return ''
  const x = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(x.getTime())) return ''
  const y = x.getFullYear()
  const m = String(x.getMonth() + 1).padStart(2, '0')
  const day = String(x.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function isTodayDateKey(key) {
  if (!key) return false
  return key === toLocalDateKey(new Date())
}
