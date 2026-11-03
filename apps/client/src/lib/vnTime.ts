/** Giờ Việt Nam (UTC+7, không có giờ mùa hè). */
export interface VnClock {
  year: number
  month: number
  day: number
  /** Giờ thập phân 0–24 */
  hour: number
  weekday: number
}

export const WEEKDAYS = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy']

export function vnNow(date: Date = new Date()): VnClock {
  const d = new Date(date.getTime() + 7 * 3600 * 1000)
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
    hour: d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600,
    weekday: d.getUTCDay(),
  }
}

export function formatClock(hour: number): string {
  const h = Math.floor(hour) % 24
  const m = Math.floor((hour - Math.floor(hour)) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function dateKey(c: Pick<VnClock, 'year' | 'month' | 'day'>): string {
  return `${c.year}-${String(c.month).padStart(2, '0')}-${String(c.day).padStart(2, '0')}`
}
