import { BufferAttribute, BufferGeometry, CircleGeometry, ConeGeometry, LatheGeometry, Matrix4, Quaternion, SphereGeometry, TorusGeometry, Vector2, Vector3 } from 'three'
import { mulberry32 } from '../../lib/rng'
import {
  L,
  SPOTS,
  bambooClusters,
  bellColumns,
  hallColumns,
  lanternPoles,
  planters,
  plaques,
  pots,
  stoneLanterns,
  stupa,
  trees,
} from '../layout'
import { type BuiltPart, WorldBuilder } from './builder'
import { type RoofSpec, addRoof } from './roof'
import { addBuddhaStatue } from './statue'

type Rng = () => number

/** Độ cao mặt mái tại một điểm cục bộ (bỏ qua phần cong ở góc) để tường/cột chạm khít mái. */
export function roofY(s: RoofSpec, lx: number, lz: number): number {
  const R = Math.max(0, Math.min(s.ridgeHalf, s.w - 0.01))
  const t = Math.min(1, Math.max(Math.abs(lz) / s.d, (Math.abs(lx) - R) / (s.w - R)))
  const p = 0.62 * (2 * t - t * t) + 0.38 * t
  return s.ridgeY - (s.ridgeY - s.eaveY) * p
}

export const HALL_ROOF: RoofSpec = { cx: 0, cz: -14, w: 9.9, d: 6.9, ridgeHalf: 3.55, eaveY: L.hall.eave, ridgeY: L.hall.ridge, lift: 0.85, flare: 0.55, ornament: 'pearl' }
const GATE_LOWER: RoofSpec = { cx: 0, cz: 30, w: 3.95, d: 1.95, ridgeHalf: 2.2, eaveY: 4.2, ridgeY: 5.15, lift: 0.55, flare: 0.4, ornament: 'none' }
const GATE_UPPER: RoofSpec = { cx: 0, cz: 30, w: 2.95, d: 1.45, ridgeHalf: 1.6, eaveY: 5.65, ridgeY: 6.75, lift: 0.5, flare: 0.35, ornament: 'pearl' }
const sideGateRoof = (side: number): RoofSpec => ({ cx: side * 5.2, cz: 30, w: 2.95, d: 1.8, ridgeHalf: 1.3, eaveY: 3.15, ridgeY: 4.05, lift: 0.4, flare: 0.3, ornament: 'none' })
const BELL_LOWER: RoofSpec = { cx: L.bellTower.x, cz: L.bellTower.z, w: 2.95, d: 2.95, ridgeHalf: 0, eaveY: 3.55, ridgeY: 4.55, lift: 0.45, flare: 0.35, ornament: 'none' }
const BELL_UPPER: RoofSpec = { cx: L.bellTower.x, cz: L.bellTower.z, w: 1.95, d: 1.95, ridgeHalf: 0, eaveY: 4.9, ridgeY: 5.95, lift: 0.4, flare: 0.3, ornament: 'finial' }
const galleryRoof = (side: number): RoofSpec => ({ cx: side * 19.7, cz: 10, w: 14.9, d: 3.7, ridgeHalf: 11.4, eaveY: 3.1, ridgeY: 4.6, lift: 0.35, flare: 0.25, rotY: Math.PI / 2, ornament: 'none' })

/** Các khối cản tầm nhìn camera: [minX, maxX, minY, maxY, minZ, maxZ]. */
export const CAMERA_BLOCKERS: Array<[number, number, number, number, number, number]> = [
  [-9.9, 9.9, L.hall.eave, L.hall.ridge, -20.9, -7.1],
  [-8.2, 8.2, 0.9, 4.95, -19.3, -18.9],
  [7.8, 8.2, 0.9, 4.95, -19.3, -9.4],
  [-8.2, -7.8, 0.9, 4.95, -19.3, -9.4],
  [-3.95, 3.95, 3.3, 6.8, 28.05, 31.95],
  [1.6, 4.2, 0, 4.5, 29, 31],
  [-4.2, -1.6, 0, 4.5, 29, 31],
  [6.2, 7.4, 0, 3.4, 29, 31],
  [-7.4, -6.2, 0, 3.4, 29, 31],
  [7.55, 13.45, 3.55, 6, 13.05, 18.95],
  [16.8, 22.6, 0, 4.6, -4, 24],
  [-22.6, -16.8, 0, 4.6, -4, 24],
  [7.4, 24.4, 0, 2.4, 29.75, 30.25],
  [-24.4, -7.4, 0, 2.4, 29.75, 30.25],
]

export function buildTemple(): BuiltPart[] {
  const b = new WorldBuilder()
  const r = mulberry32(2026)
  ground(b)
  walls(b)
  tamQuan(b)
  courtyard(b, r)
  bellTower(b)
  galleries(b)
  hall(b)
  backGarden(b, r)
  pond(b, r)
  vegetation(b, r)
  infoStands(b)
  hills(b, r)
  return b.build()
}

/* ----------------------------- Nền và lối đi ----------------------------- */

function ground(b: WorldBuilder) {
  b.planeXZ('grass', -230, 230, -230, 230, 0, 4)
  const c = L.courtyard
  b.planeXZ('brick', c.minX, c.maxX, c.minZ, c.maxZ, 0.012, 2)
  b.planeXZ('path', -1.8, 1.8, c.minZ, c.maxZ, 0.022, 2.5)
  b.planeXZ('path', -2, 2, c.maxZ, 52, 0.016, 2.5)
  b.planeXZ('path', 1.8, L.bellTower.minX, 15.2, 16.8, 0.022, 2.5)
  b.planeXZ('path', -6.9, -1.8, 6.6, 8.0, 0.022, 2.5)
}

function wall(b: WorldBuilder, minX: number, maxX: number, minZ: number, maxZ: number) {
  b.boxMinMax('plinth', minX - 0.06, maxX + 0.06, 0, 0.35, minZ - 0.06, maxZ + 0.06)
  b.boxMinMax('plaster', minX, maxX, 0.35, 2.3, minZ, maxZ)
  b.boxMinMax('ridge', minX - 0.14, maxX + 0.14, 2.3, 2.46, minZ - 0.14, maxZ + 0.14)
}

function wallPost(b: WorldBuilder, x: number, z: number) {
  b.boxMinMax('plaster', x - 0.38, x + 0.38, 0, 2.75, z - 0.38, z + 0.38)
  b.boxMinMax('ridge', x - 0.46, x + 0.46, 2.75, 2.9, z - 0.46, z + 0.46)
  b.sphere('plaster', x, 3.08, z, 0.2, 0.24, 0.2)
}

function walls(b: WorldBuilder) {
  wall(b, 7.4, 24.25, 29.75, 30.25)
  wall(b, -24.25, -7.4, 29.75, 30.25)
  wall(b, 23.75, 24.25, -30.25, 29.75)
  wall(b, -24.25, -23.75, -30.25, 29.75)
  wall(b, -23.75, 23.75, -30.25, -29.75)
  for (const x of [12, 18, 24]) {
    wallPost(b, x, 30)
    wallPost(b, -x, 30)
  }
  for (const z of [20, 8, -4, -16, -30]) {
    wallPost(b, 24, z)
    wallPost(b, -24, z)
  }
  for (const x of [-12, 0, 12]) wallPost(b, x, -30)
}

/* -------------------------------- Tam quan ------------------------------- */

function pier(b: WorldBuilder, minX: number, maxX: number, h: number) {
  b.boxMinMax('plinth', minX - 0.08, maxX + 0.08, 0, 0.42, 28.92, 31.08)
  b.boxMinMax('plaster', minX, maxX, 0.42, h, 29, 31)
  b.boxMinMax('woodDark', minX - 0.04, maxX + 0.04, h - 0.32, h - 0.22, 28.96, 31.04)
}

function tamQuan(b: WorldBuilder) {
  const centralH = roofY(GATE_LOWER, 1.6, 1) + 0.05
  const sideH = roofY(sideGateRoof(1), 1, 1) + 0.05
  for (const side of [-1, 1]) {
    pier(b, side > 0 ? 1.6 : -3.0, side > 0 ? 3.0 : -1.6, centralH)
    pier(b, side > 0 ? 3.0 : -4.2, side > 0 ? 4.2 : -3.0, sideH)
    pier(b, side > 0 ? 6.2 : -7.4, side > 0 ? 7.4 : -6.2, sideH)
    // Lanh tô cổng phụ
    b.boxMinMax('plaster', side > 0 ? 4.2 : -6.2, side > 0 ? 6.2 : -4.2, 2.5, sideH, 29.08, 30.92)
    b.boxMinMax('woodDark', side > 0 ? 4.2 : -6.2, side > 0 ? 6.2 : -4.2, 2.42, 2.52, 29.02, 30.98)
    // Cánh cổng mở, ép sát mặt trong của trụ
    b.boxMinMax('lacquer', side > 0 ? 1.62 : -3.22, side > 0 ? 3.22 : -1.62, 0.05, 3.25, 28.86, 28.94)
    b.boxMinMax('lacquer', side > 0 ? 4.22 : -5.22, side > 0 ? 5.22 : -4.22, 0.05, 2.45, 29.0, 29.06)
    addRoof(b, sideGateRoof(side))
  }
  // Lanh tô cổng giữa và khung gỗ
  b.boxMinMax('plaster', -1.6, 1.6, 3.3, centralH, 29.05, 30.95)
  b.boxMinMax('woodDark', -1.6, 1.6, 3.22, 3.32, 29.0, 31.0)
  addRoof(b, GATE_LOWER)
  b.boxMinMax('plaster', -2.3, 2.3, 4.85, roofY(GATE_UPPER, 2.3, 0.55) + 0.05, 29.45, 30.55)
  addRoof(b, GATE_UPPER)
}

/* -------------------------------- Sân chùa ------------------------------- */

function courtyard(b: WorldBuilder, r: Rng) {
  // Lư hương: bệ đá và đỉnh đồng
  b.boxMinMax('stone', -0.9, 0.9, 0, 0.5, 11.1, 12.9)
  b.boxMinMax('stoneDark', -1.0, 1.0, 0.5, 0.62, 11.0, 13.0)
  const bowl = new LatheGeometry(
    [
      new Vector2(0.001, 0.62),
      new Vector2(0.42, 0.62),
      new Vector2(0.64, 0.74),
      new Vector2(0.8, 0.96),
      new Vector2(0.82, 1.18),
      new Vector2(0.74, 1.4),
      new Vector2(0.7, 1.45),
      new Vector2(0.79, 1.5),
      new Vector2(0.8, 1.55),
    ],
    28,
  )
  b.add('bronze', bowl, new Matrix4().makeTranslation(L.burner.x, 0, L.burner.z))
  b.add('sand', new CircleGeometry(0.71, 24).rotateX(-Math.PI / 2), new Matrix4().makeTranslation(L.burner.x, L.burner.top - 0.02, L.burner.z))
  for (const side of [-1, 1]) {
    const handle = new TorusGeometry(0.15, 0.035, 8, 16)
    b.add('bronze', handle, new Matrix4().makeRotationY(Math.PI / 2).setPosition(L.burner.x + side * 0.86, 1.36, L.burner.z))
  }
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4
    b.sphere('bronze', L.burner.x + Math.sin(a) * 0.55, 0.66, L.burner.z + Math.cos(a) * 0.55, 0.12, 0.08, 0.12)
  }

  // Cột cờ
  const f = L.flag
  b.boxMinMax('stone', f.x - 0.42, f.x + 0.42, 0, 0.42, f.z - 0.42, f.z + 0.42)
  b.cyl('white', f.x, 0.42, f.z, 0.045, 0.07, 7.3, 10)
  b.sphere('gold', f.x, 7.78, f.z, 0.09)

  // Cột đèn lồng dọc lối giữa
  for (const p of lanternPoles) {
    const dir = p.x > 0 ? -1 : 1
    b.cyl('woodDark', p.x, 0, p.z, 0.05, 0.07, 2.75, 8)
    b.box('woodDark', p.x + dir * 0.22, 2.62, p.z, 0.5, 0.06, 0.06)
    const lx = p.x + dir * 0.42
    b.cyl('woodDark', lx, 2.33, p.z, 0.008, 0.008, 0.3, 4)
    b.cyl('gold', lx, 2.28, p.z, 0.09, 0.11, 0.05, 12)
    b.cyl('lantern', lx, 1.95, p.z, 0.17, 0.17, 0.33, 14)
    b.sphere('lantern', lx, 2.115, p.z, 0.2, 0.19, 0.2, 0, 0, 14)
    b.cyl('gold', lx, 1.9, p.z, 0.11, 0.09, 0.05, 12)
    b.cyl('redCloth', lx, 1.62, p.z, 0.025, 0.04, 0.28, 6)
  }

  // Đèn đá
  for (const s of stoneLanterns) {
    b.boxMinMax('stone', s.x - 0.32, s.x + 0.32, 0, 0.28, s.z - 0.32, s.z + 0.32)
    b.cyl('stone', s.x, 0.28, s.z, 0.12, 0.15, 0.62, 10)
    b.boxMinMax('stoneDark', s.x - 0.23, s.x + 0.23, 0.9, 1.26, s.z - 0.23, s.z + 0.23)
    const cap = new ConeGeometry(0.44, 0.32, 4)
    b.add('stone', cap, new Matrix4().makeRotationY(Math.PI / 4).setPosition(s.x, 1.42, s.z))
    b.sphere('stone', s.x, 1.64, s.z, 0.09)
  }

  // Chậu cây cảnh
  const potShape = new LatheGeometry([new Vector2(0.001, 0), new Vector2(0.28, 0), new Vector2(0.38, 0.38), new Vector2(0.42, 0.46), new Vector2(0.001, 0.46)], 16)
  for (const p of pots) {
    b.add('pot', potShape.clone(), new Matrix4().makeTranslation(p.x, 0, p.z))
    b.cyl('trunk', p.x, 0.4, p.z, 0.05, 0.08, 0.7, 6)
    for (let i = 0; i < 4; i++) {
      const a = r() * Math.PI * 2
      b.blob(i % 2 ? 'leaf' : 'leafDark', p.x + Math.cos(a) * 0.35, 1.05 + r() * 0.45, p.z + Math.sin(a) * 0.35, 0.32 + r() * 0.15, 0.6)
    }
  }
  potShape.dispose()

  // Bồn hoa trước thềm
  for (const pl of planters) {
    b.boxMinMax('stone', pl.minX, pl.maxX, 0, 0.45, pl.minZ, pl.maxZ)
    for (let i = 0; i < 9; i++) {
      const x = pl.minX + 0.25 + r() * (pl.maxX - pl.minX - 0.5)
      const z = pl.minZ + 0.2 + r() * (pl.maxZ - pl.minZ - 0.4)
      b.blob('leafDark', x, 0.55, z, 0.24 + r() * 0.1, 0.7, 0)
      b.blob(r() < 0.5 ? 'flowerPink' : 'flowerYellow', x + 0.08, 0.72, z, 0.09 + r() * 0.05, 0.9, 0)
    }
  }
}

/* -------------------------------- Gác chuông ------------------------------ */

function bellTower(b: WorldBuilder) {
  const B = L.bellTower
  b.boxMinMax('stoneDark', B.minX, B.maxX, 0, B.floor, B.minZ, B.maxZ)
  b.planeXZ('brick', B.minX + 0.05, B.maxX - 0.05, B.minZ + 0.05, B.maxZ - 0.05, B.floor + 0.005, 1.6)
  b.boxMinMax('stone', B.minX - 0.5, B.minX, 0, 0.22, 15.2, 16.8)
  const colTop = roofY(BELL_LOWER, 1.9, 1.9) + 0.05
  for (const c of bellColumns) {
    b.cyl('stone', c.x, B.floor, c.z, 0.24, 0.27, 0.14, 12)
    b.cyl('lacquer', c.x, B.floor + 0.14, c.z, 0.16, 0.17, colTop - B.floor - 0.14, 14)
  }
  const y0 = colTop - 0.25
  b.boxMinMax('woodDark', 8.5, 12.5, y0, colTop, 14.0, 14.2)
  b.boxMinMax('woodDark', 8.5, 12.5, y0, colTop, 17.8, 18.0)
  b.boxMinMax('woodDark', 8.5, 8.7, y0, colTop, 14.0, 18.0)
  b.boxMinMax('woodDark', 12.3, 12.5, y0, colTop, 14.0, 18.0)
  // Xà treo chuông
  b.boxMinMax('woodDark', 8.6, 12.4, 3.32, 3.52, 15.88, 16.12)
  addRoof(b, BELL_LOWER)
  b.boxMinMax('plaster', 9.35, 11.65, 4.3, roofY(BELL_UPPER, 1.15, 1.15) + 0.05, 14.85, 17.15)
  addRoof(b, BELL_UPPER)
}

/* ------------------------------ Hành lang hai bên ------------------------------ */

function galleries(b: WorldBuilder) {
  for (const side of [-1, 1]) {
    const inner = side * 16.8
    const outer = side * 22.6
    const minX = Math.min(inner, outer)
    const maxX = Math.max(inner, outer)
    const roof = galleryRoof(side)
    const top = roofY(roof, 0, 2.6) + 0.05
    b.boxMinMax('stoneDark', minX, maxX, 0, 0.3, -4, 24)
    b.planeXZ('brick', minX, maxX, -4, 24, 0.305, 1.6)
    const wx = side * 22.4
    b.boxMinMax('plaster', wx - 0.2, wx + 0.2, 0.3, top, -4, 24)
    b.boxMinMax('plaster', minX + 0.3, maxX, 0.3, top, -4, -3.6)
    b.boxMinMax('plaster', minX + 0.3, maxX, 0.3, top, 23.6, 24)
    const cx = side * 17.1
    for (let z = -3.4; z <= 23.5; z += 3.36) {
      b.cyl('stone', cx, 0.3, z, 0.2, 0.22, 0.12, 10)
      b.cyl('lacquer', cx, 0.42, z, 0.13, 0.14, top - 0.42, 12)
      // Bức hoành nhỏ trên tường trong
      b.boxMinMax('woodDark', wx - side * 0.26 - 0.03, wx - side * 0.26 + 0.03, 1.2, 2.3, z + 0.9, z + 2.3)
    }
    b.boxMinMax('woodDark', cx - 0.12, cx + 0.12, top - 0.3, top, -4, 24)
    addRoof(b, roof)
  }
}

/* -------------------------------- Chính điện ------------------------------ */

function hall(b: WorldBuilder) {
  const H = L.hall
  const P = L.hallPlatform
  const S = L.stairs
  const A = L.altar
  const top = H.wallTop

  // Nền cao và bậc thềm
  b.boxMinMax('stoneDark', P.minX, P.maxX, 0, H.floor - 0.08, P.minZ, P.maxZ)
  b.boxMinMax('stone', P.minX - 0.08, P.maxX + 0.08, H.floor - 0.08, H.floor, P.minZ - 0.08, P.maxZ + 0.08)
  b.planeXZ('brick', P.minX, P.maxX, P.minZ, P.maxZ, H.floor + 0.004, 1.6)
  for (let i = 0; i < 4; i++) b.boxMinMax('stone', S.minX, S.maxX, 0, 0.225 * (i + 1), S.minZ, S.maxZ - 0.45 * i)
  for (const side of [-1, 1]) {
    b.box('stone', side * 2.72, 0.66, -5.62, 0.26, 0.34, 2.08, 0, 0.4636)
    b.boxMinMax('stone', side * 2.72 - 0.18, side * 2.72 + 0.18, 0, 0.72, -4.85, -4.5)
    b.sphere('stone', side * 2.72, 0.86, -4.68, 0.16, 0.18, 0.16)
  }
  // Lan can thấp quanh nền
  const rail = (minX: number, maxX: number, minZ: number, maxZ: number) => b.boxMinMax('stone', minX, maxX, H.floor, H.floor + 0.42, minZ, maxZ)
  rail(P.minX, S.minX - 0.1, P.maxZ - 0.22, P.maxZ)
  rail(S.maxX + 0.1, P.maxX, P.maxZ - 0.22, P.maxZ)
  rail(P.minX, P.minX + 0.22, P.minZ, P.maxZ)
  rail(P.maxX - 0.22, P.maxX, P.minZ, P.maxZ)
  rail(P.minX, P.maxX, P.minZ, P.minZ + 0.22)

  // Tường hậu và tường hồi
  b.boxMinMax('plinth', H.minX - 0.25, H.maxX + 0.25, H.floor, H.floor + 0.35, H.minZ - 0.35, H.minZ + 0.05)
  b.boxMinMax('plaster', H.minX - 0.2, H.maxX + 0.2, H.floor + 0.35, top, H.minZ - 0.3, H.minZ)
  for (const side of [-1, 1]) {
    const x0 = side > 0 ? H.maxX - 0.2 : H.minX - 0.2
    b.boxMinMax('plinth', x0 - 0.05, x0 + 0.45, H.floor, H.floor + 0.35, H.minZ - 0.3, H.maxZ - 0.4)
    b.boxMinMax('plaster', x0, x0 + 0.4, H.floor + 0.35, top, H.minZ - 0.3, H.maxZ - 0.4)
    // Cửa sổ tròn
    for (const z of [-12, -16]) {
      const win = new TorusGeometry(0.55, 0.07, 8, 28)
      b.add('woodDark', win, new Matrix4().makeRotationY(Math.PI / 2).setPosition(side * (H.maxX + 0.22), 2.7, z))
      b.box('woodDark', side * (H.maxX + 0.22), 2.7, z, 0.06, 1.05, 0.05)
      b.box('woodDark', side * (H.maxX + 0.22), 2.7, z, 0.06, 0.05, 1.05)
    }
  }

  // Cột: hàng hiên và hàng trong
  for (const c of hallColumns) {
    const front = c.z > -9.5
    b.cyl('stone', c.x, H.floor, c.z, 0.34, 0.37, 0.16, 14)
    b.cyl('lacquer', c.x, H.floor + 0.16, c.z, 0.22, 0.24, (front ? top : top + 0.3) - H.floor - 0.16, 16)
  }
  // Xà và diềm trước
  b.boxMinMax('woodDark', H.minX - 0.2, H.maxX + 0.2, 3.75, top, -9.15, -8.85)
  b.boxMinMax('gold', H.minX - 0.2, H.maxX + 0.2, 3.86, 3.92, -8.85, -8.81)
  for (const z of [-12.3, -15.6]) b.boxMinMax('woodDark', H.minX, H.maxX, 4.65, 4.95, z - 0.14, z + 0.14)
  for (const x of [-4.8, 4.8]) b.boxMinMax('woodDark', x - 0.13, x + 0.13, 4.65, 4.95, H.minZ, -9)
  b.boxMinMax('woodDark', -0.15, 0.15, 5.2, 7.6, -14.1, -13.9)

  // Vách bức bàn ở hai gian ngoài và cánh cửa mở ở gian giữa
  for (const side of [-1, 1]) {
    const x0 = side > 0 ? 5.04 : -7.8
    const x1 = side > 0 ? 7.8 : -5.04
    b.boxMinMax('woodDark', x0, x1, H.floor, H.floor + 0.75, -9.1, -8.92)
    for (let x = x0 + 0.12; x < x1; x += 0.28) b.boxMinMax('woodDark', x - 0.025, x + 0.025, H.floor + 0.75, 3.75, -9.06, -8.96)
    for (const y of [1.95, 2.85, 3.6]) b.boxMinMax('woodDark', x0, x1, y - 0.03, y + 0.03, -9.07, -8.95)
    for (const cx of [1.6, 4.8]) {
      b.boxMinMax('lacquer', side * cx - 0.03, side * cx + 0.03, H.floor + 0.05, 3.7, -9.95, -9.25)
    }
  }

  // Bàn thờ, khám thờ, tượng
  b.boxMinMax('lacquer', A.minX, A.maxX, H.floor, A.top, A.minZ, A.maxZ)
  b.boxMinMax('gold', A.minX - 0.03, A.maxX + 0.03, A.top - 0.08, A.top, A.maxZ - 0.04, A.maxZ + 0.03)
  b.boxMinMax('redCloth', A.minX + 0.15, A.maxX - 0.15, H.floor + 0.12, A.top - 0.12, A.maxZ, A.maxZ + 0.025)
  b.boxMinMax('gold', A.minX + 0.15, A.maxX - 0.15, A.top - 0.2, A.top - 0.15, A.maxZ + 0.025, A.maxZ + 0.035)
  b.boxMinMax('lacquer', -1.6, 1.6, A.top, L.statue.base, -18.8, -17.3)
  b.boxMinMax('gold', -1.63, 1.63, L.statue.base - 0.05, L.statue.base, -17.33, -17.28)
  b.boxMinMax('lacquer', -2.5, 2.5, A.top, 5.4, -18.98, -18.9)
  for (const x of [-2.45, 2.45]) b.boxMinMax('gold', x - 0.05, x + 0.05, A.top, 5.4, -18.9, -18.86)
  b.boxMinMax('gold', -2.5, 2.5, 5.35, 5.42, -18.9, -18.86)
  addBuddhaStatue(b, 0, L.statue.base, L.statue.z, 1.15)
  for (const side of [-1, 1]) {
    b.boxMinMax('lacquer', side * 5.2, side * 7.3, H.floor, 1.75, -18.9, -18.0)
    b.boxMinMax('gold', Math.min(side * 5.2, side * 7.3), Math.max(side * 5.2, side * 7.3), 1.7, 1.75, -18.0, -17.96)
    addBuddhaStatue(b, side * 6.25, 1.75, -18.45, 0.5)
    // Chân nến và lọ hoa trên bàn thờ chính
    const cx = side * 2.35
    b.cyl('bronze', cx, A.top, -16.95, 0.05, 0.1, 0.42, 10)
    b.cyl('bronze', cx, A.top + 0.42, -16.95, 0.09, 0.06, 0.04, 10)
    b.cyl('candle', cx, A.top + 0.46, -16.95, 0.04, 0.04, 0.22, 10)
    const vx = side * 1.35
    const vase = new LatheGeometry([new Vector2(0.001, 0), new Vector2(0.09, 0), new Vector2(0.13, 0.15), new Vector2(0.07, 0.34), new Vector2(0.1, 0.42), new Vector2(0.001, 0.42)], 14)
    b.add('bronze', vase, new Matrix4().makeTranslation(vx, A.top, -16.95))
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      b.blob(i % 2 ? 'flowerYellow' : 'flowerPink', vx + Math.cos(a) * 0.1, A.top + 0.55 + (i % 2) * 0.06, -16.95 + Math.sin(a) * 0.1, 0.07, 0.9, 0)
    }
    b.blob('leafDark', vx, A.top + 0.48, -16.95, 0.14, 0.7, 0)
  }
  const censer = new LatheGeometry([new Vector2(0.001, 0), new Vector2(0.12, 0), new Vector2(0.19, 0.08), new Vector2(0.18, 0.16), new Vector2(0.2, 0.17)], 18)
  b.add('bronze', censer, new Matrix4().makeTranslation(0, A.top, -16.95))
  b.add('sand', new CircleGeometry(0.17, 16).rotateX(-Math.PI / 2), new Matrix4().makeTranslation(0, A.top + 0.15, -16.95))

  // Bồ đoàn lễ Phật
  for (const s of [SPOTS.worshipPlayer, ...SPOTS.worshipBots, SPOTS.woodfish]) b.cyl('cushion', s.x, H.floor, s.z, 0.3, 0.32, 0.1, 16)
  // Mõ trên kệ
  const W = L.woodfish
  b.boxMinMax('lacquer', W.x - 0.32, W.x + 0.32, H.floor, H.floor + 0.32, W.z - 0.32, W.z + 0.32)
  b.boxMinMax('redCloth', W.x - 0.26, W.x + 0.26, H.floor + 0.32, H.floor + 0.36, W.z - 0.26, W.z + 0.26)
  b.sphere('woodMo', W.x, H.floor + 0.58, W.z, 0.3, 0.23, 0.27, 0, 0, 18)
  b.box('woodDark', W.x, H.floor + 0.6, W.z + 0.255, 0.34, 0.035, 0.05)
  // Chuông gia trì
  const SB = L.smallBell
  b.boxMinMax('lacquer', SB.x - 0.3, SB.x + 0.3, H.floor, H.floor + 0.32, SB.z - 0.3, SB.z + 0.3)
  b.cyl('redCloth', SB.x, H.floor + 0.32, SB.z, 0.22, 0.24, 0.07, 14)
  const bowl = new LatheGeometry([new Vector2(0.001, 0), new Vector2(0.16, 0.01), new Vector2(0.26, 0.12), new Vector2(0.28, 0.26)], 20)
  b.add('bronze', bowl, new Matrix4().makeTranslation(SB.x, H.floor + 0.39, SB.z))

  addRoof(b, HALL_ROOF)
}

/* ------------------------------ Vườn sau ------------------------------ */

function backGarden(b: WorldBuilder, r: Rng) {
  // Bảo tháp năm tầng
  b.boxMinMax('stone', stupa.x - 1.5, stupa.x + 1.5, 0, 0.5, stupa.z - 1.5, stupa.z + 1.5)
  let y = 0.5
  for (let i = 0; i < 5; i++) {
    const s = 2.2 - i * 0.32
    const h = 0.95 - i * 0.08
    b.boxMinMax('plaster', stupa.x - s / 2, stupa.x + s / 2, y, y + h, stupa.z - s / 2, stupa.z + s / 2)
    b.boxMinMax('ridge', stupa.x - s / 2 - 0.2, stupa.x + s / 2 + 0.2, y + h, y + h + 0.12, stupa.z - s / 2 - 0.2, stupa.z + s / 2 + 0.2)
    if (i === 0) b.boxMinMax('woodDark', stupa.x - 0.3, stupa.x + 0.3, y + 0.05, y + 0.75, stupa.z + s / 2, stupa.z + s / 2 + 0.03)
    y += h + 0.12
  }
  b.sphere('gold', stupa.x, y + 0.15, stupa.z, 0.18)
  b.cyl('gold', stupa.x, y + 0.25, stupa.z, 0.02, 0.08, 0.7, 8)

  // Bụi tre
  for (const c of bambooClusters) {
    for (let i = 0; i < 13; i++) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * c.r * 0.75
      const x = c.x + Math.cos(a) * d
      const z = c.z + Math.sin(a) * d
      const h = 6 + r() * 3.5
      const lean = new Vector3((r() - 0.5) * 1.4 + Math.cos(a) * 0.8, h, (r() - 0.5) * 1.4 + Math.sin(a) * 0.8)
      const base = new Vector3(x, 0, z)
      const tip = base.clone().add(lean)
      b.segment('bamboo', base, tip, 0.05 + r() * 0.02, 6)
      for (let k = 0; k < 3; k++) {
        const p = base.clone().lerp(tip, 0.65 + k * 0.14)
        b.blob('leafDark', p.x + (r() - 0.5) * 0.6, p.y, p.z + (r() - 0.5) * 0.6, 0.55 + r() * 0.35, 0.45, 0)
      }
    }
  }
}

/* -------------------------------- Hồ sen -------------------------------- */

function pond(b: WorldBuilder, r: Rng) {
  const P = L.pond
  const n = 58
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2
    const x = P.x + Math.cos(a) * (P.rx + 0.12)
    const z = P.z + Math.sin(a) * (P.rz + 0.12)
    b.blob(r() < 0.6 ? 'stone' : 'stoneDark', x, 0.06, z, 0.3 + r() * 0.16, 0.42, 0)
  }
  b.boxMinMax('stone', -5.7, -4.3, 0, 0.07, 39.3, 40.7)
}

/* ------------------------------- Cây cối ------------------------------- */

function vegetation(b: WorldBuilder, r: Rng) {
  for (const t of trees) {
    const s = t.s
    if (t.kind === 'round') {
      b.cyl('trunk', t.x, 0, t.z, 0.16 * s, 0.26 * s, 2.8 * s, 8)
      const n = 5
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + r()
        const d = i === 0 ? 0 : 1.1 * s
        b.blob(i % 2 ? 'leaf' : 'leafDark', t.x + Math.cos(a) * d, (3.4 + r() * 1.2) * s, t.z + Math.sin(a) * d, (1.4 + r() * 0.6) * s, 0.82)
      }
    } else {
      const h = 6.4 * s
      const lean = new Vector3((r() - 0.5) * 0.6, h, (r() - 0.5) * 0.6)
      const base = new Vector3(t.x, 0, t.z)
      const top = base.clone().add(lean)
      b.segment('trunk', base, top, 0.1, 7)
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + r() * 0.4
        b.add('leafFlat', frond(2.1, 0.55, 0.45 + r() * 0.3), new Matrix4().makeRotationY(-a).setPosition(top))
      }
      b.blob('leafDark', top.x, top.y, top.z, 0.32, 0.8, 0)
    }
  }

  // Cây bồ đề
  const B = L.bodhi
  b.cyl('stone', B.x, 0, B.z, B.platformR, B.platformR + 0.08, B.platformH, 32)
  b.cyl('trunk', B.x, B.platformH, B.z, 0.38, 0.62, 3.4, 12)
  b.blob('trunk', B.x, B.platformH + 0.15, B.z, 0.85, 0.35, 1)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + 0.3
    const from = new Vector3(B.x, 3.1, B.z)
    const to = new Vector3(B.x + Math.cos(a) * 2.4, 4.7 + r() * 0.8, B.z + Math.sin(a) * 2.4)
    b.segment('trunk', from, to, 0.17, 8)
  }
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 + r() * 0.3
    const d = i < 2 ? r() * 0.8 : 1.6 + r() * 1.8
    b.blob(i % 3 === 0 ? 'leafDark' : 'leaf', B.x + Math.cos(a) * d, 5 + r() * 2.3, B.z + Math.sin(a) * d, 1.7 + r() * 0.8, 0.72)
  }
  for (const s of SPOTS.meditation) b.cyl('cushion', s.x, B.platformH, s.z, 0.3, 0.32, 0.1, 16)

  // Cỏ bụi dọc chân tường và hàng rào cây ngoài lối vào
  for (let i = 0; i < 70; i++) {
    const side = r()
    let x: number
    let z: number
    if (side < 0.35) {
      x = (r() < 0.5 ? -1 : 1) * (23.1 - r() * 0.6)
      z = -29 + r() * 52
    } else if (side < 0.55) {
      x = -23 + r() * 46
      z = -29.1 + r() * 0.6
    } else {
      x = (r() < 0.5 ? -1 : 1) * (26.6 + r() * 0.8)
      z = 30.8 + r() * 21
    }
    b.blob('leafDark', x, 0.15, z, 0.45 + r() * 0.45, 0.6, 0)
  }
  for (let x = -27; x <= 27; x += 1.5) b.blob(r() < 0.5 ? 'leafDark' : 'leaf', x, 0.25, 52.6 + r() * 0.4, 0.8 + r() * 0.3, 0.7, 0)
}

/** Tàu lá cau: dải phẳng cong xuống, thon dần về ngọn, nằm dọc trục +x. */
function frond(len: number, width: number, droop: number): BufferGeometry {
  const n = 6
  const pos: number[] = []
  const idx: number[] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const x = t * len
    const y = 0.35 * Math.sin(t * Math.PI * 0.6) - droop * t * t * 1.6
    const w = (width / 2) * Math.sin(Math.min(1, t * 1.4 + 0.15) * Math.PI) * (1 - t * 0.5)
    pos.push(x, y, -w, x, y - 0.04, w)
  }
  for (let i = 0; i < n; i++) {
    const a = i * 2
    idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/* --------------------------- Bảng giới thiệu --------------------------- */

function infoStands(b: WorldBuilder) {
  for (const p of plaques) {
    const c = Math.cos(p.yaw)
    const s = Math.sin(p.yaw)
    for (const side of [-1, 1]) {
      const ox = c * side * 0.42
      const oz = -s * side * 0.42
      b.box('woodDark', p.x + ox, 0.7, p.z + oz, 0.08, 1.4, 0.08, p.yaw)
    }
    b.box('lacquer', p.x, 1.12, p.z, 0.92, 0.6, 0.06, p.yaw)
    b.box('gold', p.x, 1.44, p.z, 0.98, 0.05, 0.08, p.yaw)
    b.box('ridge', p.x, 1.5, p.z, 1.1, 0.06, 0.24, p.yaw)
  }
}

/* -------------------------------- Đồi xa -------------------------------- */

function hills(b: WorldBuilder, r: Rng) {
  // Hai lớp đồi thấp, tròn: lớp gần đậm hơn, lớp xa chìm vào sương
  for (const [count, dMin, dMax, hMin, hMax] of [
    [22, 105, 135, 7, 15],
    [16, 150, 185, 14, 28],
  ] as const) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + r() * 0.25
      const d = dMin + r() * (dMax - dMin)
      const rad = 26 + r() * 22
      const h = hMin + r() * (hMax - hMin)
      const m = new Matrix4().compose(
        new Vector3(Math.sin(a) * d, -h * 0.15, Math.cos(a) * d),
        new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), r() * Math.PI),
        new Vector3(rad, h, rad * (0.7 + r() * 0.5)),
      )
      b.add('hill', new SphereGeometry(1, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), m)
    }
  }
}
