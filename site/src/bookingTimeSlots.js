/**
 * Та же логика, что в mobile/src/client/screens/BoatDetailScreen.js
 * (слоты, расписание, пересечение с busy).
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
  return TIME_SLOTS.filter((slot) => {
    const slotMin = slotToMinutes(slot)
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
