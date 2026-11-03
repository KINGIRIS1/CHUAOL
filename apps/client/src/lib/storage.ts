/**
 * localStorage có thể bị chặn (cửa sổ ẩn danh, iframe sandbox) nên mọi lần đọc/ghi đều bọc try/catch.
 * Game vẫn chạy bình thường khi không lưu được.
 */
export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = globalThis.localStorage?.getItem(key)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as T) }
  } catch {
    return fallback
  }
}

export function saveJSON(key: string, value: unknown): void {
  try {
    globalThis.localStorage?.setItem(key, JSON.stringify(value))
  } catch {
    /* bỏ qua: không lưu được thì thôi */
  }
}
