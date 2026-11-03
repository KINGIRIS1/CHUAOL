import { CircleGeometry, LatheGeometry, Matrix4, TorusGeometry, Vector2, Vector3 } from 'three'
import type { WorldBuilder } from './builder'

const PETAL = [new Vector2(0.001, -1), new Vector2(0.7, -0.6), new Vector2(0.95, 0), new Vector2(0.6, 0.6), new Vector2(0.001, 1)]

/**
 * Tượng Phật ngồi kiết già trên tòa sen, thủ ấn thiền định, quay mặt về hướng +z.
 * Dựng tạm bằng hình khối cách điệu; bản chính thức sẽ do họa sĩ 3D tạo hình và cố vấn duyệt.
 */
export function addBuddhaStatue(b: WorldBuilder, x: number, y: number, z: number, s = 1): void {
  const at = (lx: number, ly: number, lz: number) => new Vector3(x + lx * s, y + ly * s, z + lz * s)
  const place = (lx: number, ly: number, lz: number, sx = 1, sy = 1, sz = 1) =>
    new Matrix4().makeScale(sx * s, sy * s, sz * s).setPosition(at(lx, ly, lz))

  // Tòa sen: đế tròn và hai tầng cánh sen
  b.cyl('gold', x, y, z, 0.72 * s, 0.78 * s, 0.18 * s, 24)
  const rows: Array<[number, number, number, number, number]> = [
    // [số cánh, bán kính, độ cao, độ nghiêng, tỉ lệ]
    [14, 0.64, 0.3, 0.55, 1],
    [12, 0.52, 0.42, 0.35, 0.85],
  ]
  for (const [n, r, h, tilt, k] of rows) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (k < 1 ? Math.PI / n : 0)
      const m = new Matrix4()
        .makeRotationY(a)
        .multiply(new Matrix4().makeRotationX(tilt))
        .multiply(new Matrix4().makeScale(0.19 * k * s, 0.3 * k * s, 0.07 * s))
      m.setPosition(at(Math.sin(a) * r, h, Math.cos(a) * r))
      b.add('gold', new LatheGeometry(PETAL, 10), m)
    }
  }
  b.cyl('gold', x, y + 0.42 * s, z, 0.56 * s, 0.5 * s, 0.07 * s, 24)

  const y0 = 0.49
  // Chân xếp bằng
  b.sphere('gold', x, y + (y0 + 0.13) * s, z + 0.08 * s, 0.6 * s, 0.19 * s, 0.42 * s)
  // Thân (dẹt theo chiều trước–sau)
  const torso = new LatheGeometry(
    [
      new Vector2(0.001, 0),
      new Vector2(0.35, 0.02),
      new Vector2(0.37, 0.16),
      new Vector2(0.35, 0.36),
      new Vector2(0.37, 0.54),
      new Vector2(0.39, 0.63),
      new Vector2(0.31, 0.71),
      new Vector2(0.14, 0.77),
      new Vector2(0.09, 0.82),
      new Vector2(0.001, 0.83),
    ],
    20,
  )
  b.add('gold', torso, place(0, y0 + 0.1, -0.02, 1, 1, 0.74))
  // Tay: cánh tay trên, cẳng tay, hai bàn tay đặt trong lòng
  for (const side of [-1, 1]) {
    const shoulder = at(side * 0.34, y0 + 0.78, 0)
    const elbow = at(side * 0.42, y0 + 0.4, 0.08)
    const hand = at(side * 0.07, y0 + 0.24, 0.3)
    b.segment('gold', shoulder, elbow, 0.09 * s, 10)
    b.sphere('gold', elbow.x, elbow.y, elbow.z, 0.09 * s)
    b.segment('gold', elbow, hand, 0.075 * s, 10)
  }
  b.sphere('gold', x, y + (y0 + 0.25) * s, z + 0.3 * s, 0.2 * s, 0.06 * s, 0.12 * s)
  // Cổ, đầu, nhục kế, tai
  b.cyl('gold', x, y + (y0 + 0.86) * s, z, 0.08 * s, 0.09 * s, 0.12 * s, 12)
  b.sphere('gold', x, y + (y0 + 1.1) * s, z, 0.185 * s, 0.205 * s, 0.18 * s, 0, 0, 18)
  b.sphere('gold', x, y + (y0 + 1.31) * s, z - 0.01 * s, 0.1 * s, 0.09 * s, 0.1 * s)
  for (const side of [-1, 1]) b.sphere('gold', x + side * 0.185 * s, y + (y0 + 1.06) * s, z, 0.035 * s, 0.11 * s, 0.05 * s)
  // Hào quang sau đầu và vầng sáng sau thân
  b.add('gold', new TorusGeometry(0.34, 0.025, 8, 40), place(0, y0 + 1.12, -0.2))
  b.add('gold', new CircleGeometry(0.33, 32), place(0, y0 + 1.12, -0.22))
  b.add('gold', new TorusGeometry(0.8, 0.03, 8, 48), place(0, y0 + 0.7, -0.34, 0.82, 1.15, 1))
}
