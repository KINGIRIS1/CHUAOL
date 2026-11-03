import { loadJSON, saveJSON } from '../lib/storage'

/** Lời nguyện riêng tư: chỉ lưu trên máy người chơi, không gửi đi đâu. */
export interface Wish {
  kind: 'incense' | 'lantern'
  text: string
  at: string
}

const KEY = 'chuaol.wishes.v1'

export function loadWishes(): Wish[] {
  const w = loadJSON<{ items: Wish[] }>(KEY, { items: [] })
  return Array.isArray(w.items) ? w.items : []
}

export function addWish(kind: Wish['kind'], text: string): void {
  const t = text.trim()
  if (!t) return
  const items = [{ kind, text: t.slice(0, 200), at: new Date().toISOString() }, ...loadWishes()].slice(0, 20)
  saveJSON(KEY, { items })
}

export function clearWishes(): void {
  saveJSON(KEY, { items: [] })
}
