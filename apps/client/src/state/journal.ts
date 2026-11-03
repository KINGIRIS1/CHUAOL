import { loadJSON, saveJSON } from '../lib/storage'

/** Nhật ký tu tập riêng tư, chỉ lưu trên máy người chơi. Không xếp hạng, không so sánh. */
export interface Journal {
  incenseSticks: number
  bellRings: number
  prostrations: number
  recitations: number
  meditationSec: number
  lanterns: number
  visitDays: string[]
}

export const EMPTY_JOURNAL: Journal = {
  incenseSticks: 0,
  bellRings: 0,
  prostrations: 0,
  recitations: 0,
  meditationSec: 0,
  lanterns: 0,
  visitDays: [],
}

const KEY = 'chuaol.journal.v1'

export function loadJournal(): Journal {
  const j = loadJSON<Journal>(KEY, EMPTY_JOURNAL)
  return { ...j, visitDays: Array.isArray(j.visitDays) ? j.visitDays.slice(-120) : [] }
}

export function saveJournal(j: Journal): void {
  saveJSON(KEY, j)
}

export function withVisit(j: Journal, today: string): Journal {
  if (j.visitDays.includes(today)) return j
  return { ...j, visitDays: [...j.visitDays, today].slice(-120) }
}

function prevDay(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  const t = new Date(Date.UTC(y, m - 1, d) - 86400000)
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}-${String(t.getUTCDate()).padStart(2, '0')}`
}

/** Số ngày liên tiếp có ghé chùa, tính tới hôm nay. */
export function visitStreak(days: readonly string[], today: string): number {
  const set = new Set(days)
  let n = 0
  let cur = today
  while (set.has(cur)) {
    n++
    cur = prevDay(cur)
  }
  return n
}

export const MILESTONES: Array<{ id: string; text: string; reached: (j: Journal, streak: number) => boolean }> = [
  { id: 'first-incense', text: 'Thắp nén hương đầu tiên', reached: (j) => j.incenseSticks > 0 },
  { id: 'bell', text: 'Thỉnh một hồi chuông', reached: (j) => j.bellRings > 0 },
  { id: 'meditate-5', text: 'Ngồi thiền đủ 5 phút', reached: (j) => j.meditationSec >= 300 },
  { id: 'recite-10', text: 'Niệm Phật 10 lần cùng tiếng mõ', reached: (j) => j.recitations >= 10 },
  { id: 'lantern', text: 'Thả một ngọn đèn hoa đăng', reached: (j) => j.lanterns > 0 },
  { id: 'streak-3', text: 'Ghé chùa 3 ngày liền', reached: (_j, s) => s >= 3 },
]
