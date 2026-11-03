/** Bộ sinh số ngẫu nhiên có seed (mulberry32) để cảnh vật giống nhau mỗi lần tải. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const rand = (min: number, max: number, r: () => number = Math.random) => min + (max - min) * r()

export function pick<T>(items: readonly T[], r: () => number = Math.random): T {
  return items[Math.floor(r() * items.length) % items.length]
}

export const clamp = (v: number, lo: number, hi: number) => (v < lo ? lo : v > hi ? hi : v)
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smoothstep = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}
/** Tiến dần tới giá trị đích, độc lập với FPS. */
export const damp = (current: number, target: number, rate: number, dt: number) =>
  lerp(current, target, 1 - Math.exp(-rate * dt))

export function angleDiff(a: number, b: number): number {
  let d = (b - a) % (Math.PI * 2)
  if (d > Math.PI) d -= Math.PI * 2
  if (d < -Math.PI) d += Math.PI * 2
  return d
}

export const dampAngle = (current: number, target: number, rate: number, dt: number) =>
  current + angleDiff(current, target) * (1 - Math.exp(-rate * dt))
