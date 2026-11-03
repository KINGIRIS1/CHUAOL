import type { Collider } from './layout'
import { L } from './layout'

export interface Point2 {
  x: number
  z: number
}

/**
 * Đẩy một hình tròn (người) ra khỏi các vật cản 2D trên mặt phẳng XZ.
 * Sân chùa phẳng nên không cần engine vật lý đầy đủ ở bản chơi thử.
 */
export function resolveCircle(p: Point2, radius: number, colliders: readonly Collider[], iterations = 2): void {
  for (let it = 0; it < iterations; it++) {
    for (const c of colliders) {
      if (c.kind === 'circle') {
        const dx = p.x - c.x
        const dz = p.z - c.z
        const min = c.r + radius
        const d2 = dx * dx + dz * dz
        if (d2 < min * min) {
          const d = Math.sqrt(d2) || 1e-4
          p.x = c.x + (dx / d) * min
          p.z = c.z + (dz / d) * min
        }
      } else if (c.kind === 'box') {
        const qx = Math.max(c.minX, Math.min(p.x, c.maxX))
        const qz = Math.max(c.minZ, Math.min(p.z, c.maxZ))
        const dx = p.x - qx
        const dz = p.z - qz
        const d2 = dx * dx + dz * dz
        if (d2 > 1e-10) {
          if (d2 < radius * radius) {
            const d = Math.sqrt(d2)
            p.x = qx + (dx / d) * radius
            p.z = qz + (dz / d) * radius
          }
        } else {
          // Tâm nằm trong hộp: đẩy ra theo cạnh gần nhất
          const left = p.x - c.minX
          const right = c.maxX - p.x
          const back = p.z - c.minZ
          const front = c.maxZ - p.z
          const m = Math.min(left, right, back, front)
          if (m === left) p.x = c.minX - radius
          else if (m === right) p.x = c.maxX + radius
          else if (m === back) p.z = c.minZ - radius
          else p.z = c.maxZ + radius
        }
      } else {
        // Elip: xấp xỉ bằng cách co giãn về hình tròn đơn vị
        const ex = (p.x - c.x) / (c.rx + radius)
        const ez = (p.z - c.z) / (c.rz + radius)
        const d2 = ex * ex + ez * ez
        if (d2 < 1) {
          const d = Math.sqrt(d2) || 1e-4
          p.x = c.x + (ex / d) * (c.rx + radius)
          p.z = c.z + (ez / d) * (c.rz + radius)
        }
      }
    }
  }
  const b = L.bounds
  p.x = Math.max(b.minX + radius, Math.min(b.maxX - radius, p.x))
  p.z = Math.max(b.minZ + radius, Math.min(b.maxZ - radius, p.z))
}

/** true nếu điểm nằm trong một vật cản (dùng cho kiểm thử bố cục). */
export function isBlocked(p: Point2, radius: number, colliders: readonly Collider[]): boolean {
  const q = { ...p }
  resolveCircle(q, radius, colliders, 1)
  return Math.hypot(q.x - p.x, q.z - p.z) > 1e-3
}
