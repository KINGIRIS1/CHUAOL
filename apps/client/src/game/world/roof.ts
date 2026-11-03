import { BoxGeometry, BufferAttribute, BufferGeometry, CatmullRomCurve3, ConeGeometry, Matrix4, SphereGeometry, TubeGeometry, Vector3 } from 'three'
import type { WorldBuilder } from './builder'

export interface RoofSpec {
  cx: number
  cz: number
  /** Nửa chiều rộng theo trục x cục bộ (đã gồm phần mái đua) */
  w: number
  /** Nửa chiều sâu theo trục z cục bộ */
  d: number
  /** Nửa chiều dài bờ nóc (0 = mái chóp) */
  ridgeHalf: number
  eaveY: number
  ridgeY: number
  /** Độ cong vút của đầu đao */
  lift?: number
  /** Độ vươn ra của đầu đao */
  flare?: number
  rotY?: number
  ornament?: 'pearl' | 'finial' | 'none'
}

type Face = {
  eave: (u: number) => [number, number]
  ridge: (u: number) => [number, number]
  corner: (u: number) => [number, number]
  edgeLen: number
  run: number
}

const profile = (t: number) => 0.62 * (2 * t - t * t) + 0.38 * t
const cornerFactor = (u: number) => Math.pow(Math.abs(2 * u - 1), 3)
const sgn = (v: number) => (v < 0 ? -1 : 1)

/** Mái chùa kiểu bốn mái: mặt mái hơi võng, bốn góc cong vút lên (đầu đao). */
export function addRoof(b: WorldBuilder, s: RoofSpec): void {
  const { w, d, eaveY, ridgeY } = s
  const R = Math.max(0, Math.min(s.ridgeHalf, w - 0.01))
  const lift = s.lift ?? 0.6
  const flare = s.flare ?? 0.4
  const toWorld = new Matrix4().makeRotationY(s.rotY ?? 0).setPosition(s.cx, 0, s.cz)
  const drop = ridgeY - eaveY

  const faces: Face[] = [
    { eave: (u) => [-w + 2 * w * u, d], ridge: (u) => [-R + 2 * R * u, 0], corner: (u) => [sgn(2 * u - 1), 1], edgeLen: 2 * w, run: d },
    { eave: (u) => [w - 2 * w * u, -d], ridge: (u) => [R - 2 * R * u, 0], corner: (u) => [-sgn(2 * u - 1), -1], edgeLen: 2 * w, run: d },
    { eave: (u) => [w, d - 2 * d * u], ridge: () => [R, 0], corner: (u) => [1, -sgn(2 * u - 1)], edgeLen: 2 * d, run: w - R },
    { eave: (u) => [-w, -d + 2 * d * u], ridge: () => [-R, 0], corner: (u) => [-1, sgn(2 * u - 1)], edgeLen: 2 * d, run: w - R },
  ]

  const point = (f: Face, u: number, t: number): [number, number, number] => {
    const [ex, ez] = f.eave(u)
    const [rx, rz] = f.ridge(u)
    const cf = cornerFactor(u) * t * t
    const [sx, sz] = f.corner(u)
    const x = rx + (ex - rx) * t + sx * flare * cf * 0.7
    const z = rz + (ez - rz) * t + sz * flare * cf * 0.7
    const y = ridgeY - drop * profile(t) + lift * cf
    return [x, y, z]
  }

  const nu = 22
  const nt = 10
  for (const f of faces) {
    const pos: number[] = []
    const uv: number[] = []
    const slope = Math.hypot(f.run, drop)
    for (let i = 0; i <= nu; i++) {
      for (let j = 0; j <= nt; j++) {
        const u = i / nu
        const t = j / nt
        pos.push(...point(f, u, t))
        uv.push((u * f.edgeLen) / 1.8, (t * slope) / 1.5)
      }
    }
    const idx: number[] = []
    const id = (i: number, j: number) => i * (nt + 1) + j
    for (let i = 0; i < nu; i++) {
      for (let j = 0; j < nt; j++) {
        const a = id(i, j)
        const bb = id(i + 1, j)
        const c = id(i, j + 1)
        const dd = id(i + 1, j + 1)
        idx.push(a, c, bb, bb, c, dd)
      }
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
    g.setAttribute('uv', new BufferAttribute(new Float32Array(uv), 2))
    g.setIndex(idx)
    g.computeVertexNormals()
    b.add('roof', g, toWorld)

    // Diềm mái (ván gỗ dọc theo mép hiên) tạo cảm giác mái có độ dày
    // Hai mặt dùng đỉnh riêng để pháp tuyến không triệt tiêu nhau
    for (const flip of [false, true]) {
      const fp: number[] = []
      const fi: number[] = []
      for (let i = 0; i <= nu; i++) {
        const [x, y, z] = point(f, i / nu, 1)
        fp.push(x, y + 0.02, z, x, y - 0.2, z)
      }
      for (let i = 0; i < nu; i++) {
        const a = i * 2
        if (flip) fi.push(a, a + 2, a + 1, a + 2, a + 3, a + 1)
        else fi.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
      }
      const fg = new BufferGeometry()
      fg.setAttribute('position', new BufferAttribute(new Float32Array(fp), 3))
      fg.setIndex(fi)
      fg.computeVertexNormals()
      b.add('woodDark', fg, toWorld)
    }
  }

  // Bờ dải (gờ dọc theo bốn đường giao mái) kết thúc bằng đầu đao cong
  for (const f of [faces[0], faces[1]]) {
    for (const u of [0, 1]) {
      const pts: Vector3[] = []
      for (let k = 0; k <= 6; k++) {
        const [x, y, z] = point(f, u, k / 6)
        pts.push(new Vector3(x, y + 0.08, z))
      }
      const [sx, sz] = f.corner(u)
      const tip = pts[pts.length - 1].clone()
      pts.push(tip.clone().add(new Vector3(sx * 0.14, 0.16, sz * 0.14)))
      pts.push(tip.clone().add(new Vector3(sx * 0.2, 0.38, sz * 0.2)))
      const tube = new TubeGeometry(new CatmullRomCurve3(pts), 18, 0.07, 6, false)
      b.add('ridge', tube, toWorld)
    }
  }

  // Bờ nóc và trang trí
  if (R > 0.4) {
    const ridge = new BoxGeometry(2 * R + 0.3, 0.34, 0.3)
    ridge.translate(0, ridgeY + 0.12, 0)
    b.add('ridge', ridge, toWorld)
    for (const side of [-1, 1]) {
      const kim = new BoxGeometry(0.22, 0.7, 0.26)
      kim.translate(0, 0.35, 0)
      kim.applyMatrix4(new Matrix4().makeRotationZ(-side * 0.35))
      kim.translate(side * (R + 0.18), ridgeY + 0.12, 0)
      b.add('ridge', kim, toWorld)
    }
  }
  const orn = s.ornament ?? (R > 0.4 ? 'pearl' : 'finial')
  if (orn === 'pearl') {
    const pearl = new SphereGeometry(0.17, 12, 8)
    pearl.translate(0, ridgeY + 0.5, 0)
    b.add('gold', pearl, toWorld)
    const flame = new ConeGeometry(0.1, 0.3, 8)
    flame.translate(0, ridgeY + 0.8, 0)
    b.add('gold', flame, toWorld)
  } else if (orn === 'finial') {
    const base = new SphereGeometry(0.16, 10, 8)
    base.translate(0, ridgeY + 0.08, 0)
    b.add('ridge', base, toWorld)
    const spire = new ConeGeometry(0.09, 0.5, 8)
    spire.translate(0, ridgeY + 0.42, 0)
    b.add('gold', spire, toWorld)
  }
}
