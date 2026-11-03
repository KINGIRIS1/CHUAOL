/**
 * Bố cục ngôi chùa — nguồn dữ liệu duy nhất cho hình khối, va chạm, điểm tương tác và đường đi của khách.
 *
 * Hệ tọa độ (mét): +z hướng ra cổng (phía nam), -z vào Chính điện (phía bắc), +x là phía đông.
 * Trục chính: lối vào (z≈48) → Tam quan (z=30) → sân chùa → Chính điện (z≈-14) → vườn sau.
 */

export type Box = { kind: 'box'; minX: number; maxX: number; minZ: number; maxZ: number }
export type Circle = { kind: 'circle'; x: number; z: number; r: number }
export type Ellipse = { kind: 'ellipse'; x: number; z: number; rx: number; rz: number }
export type Collider = Box | Circle | Ellipse

const box = (minX: number, maxX: number, minZ: number, maxZ: number): Box => ({ kind: 'box', minX, maxX, minZ, maxZ })
const circle = (x: number, z: number, r: number): Circle => ({ kind: 'circle', x, z, r })

export const L = {
  spawn: { x: 0, z: 47, yaw: Math.PI },
  gateZ: 30,
  wallX: 24,
  backWallZ: -30,
  courtyard: { minX: -14, maxX: 14, minZ: -4.6, maxZ: 29.4 },
  burner: { x: 0, z: 12, top: 1.52, sandR: 0.62 },
  bellTower: { x: 10.5, z: 16, minX: 8.3, maxX: 12.7, minZ: 13.8, maxZ: 18.2, floor: 0.45 },
  bell: { x: 10.5, z: 16, bottom: 1.35, height: 1.55, radius: 0.62 },
  bodhi: { x: -9.5, z: 6, platformR: 2.7, platformH: 0.35 },
  hall: { minX: -8, maxX: 8, minZ: -19, maxZ: -9, floor: 0.9, eave: 4.3, wallTop: 4.95, ridge: 8.2 },
  hallPlatform: { minX: -10, maxX: 10, minZ: -21, maxZ: -6.5 },
  stairs: { minX: -2.6, maxX: 2.6, minZ: -6.5, maxZ: -4.7 },
  altar: { minX: -3.1, maxX: 3.1, minZ: -18.9, maxZ: -16.6, top: 1.9 },
  statue: { x: 0, z: -18.05, base: 2.42 },
  woodfish: { x: -2.7, z: -15.9 },
  smallBell: { x: 2.7, z: -15.9 },
  pond: { x: -13, z: 40, rx: 7.5, rz: 5.5, water: 0.05 },
  flag: { x: -5.5, z: 21 },
  bounds: { minX: -27, maxX: 27, minZ: -29.4, maxZ: 52 },
} as const

/** Chiều cao nền tại một điểm (bậc thềm, nền Chính điện, gác chuông, bệ cây bồ đề). */
export function heightAt(x: number, z: number): number {
  const s = L.stairs
  if (x >= s.minX && x <= s.maxX && z >= s.minZ && z <= s.maxZ) {
    const t = (s.maxZ - z) / (s.maxZ - s.minZ)
    // 4 bậc thềm, mỗi bậc cao floor/4
    return (L.hall.floor * Math.min(4, Math.floor(t * 4) + 1)) / 4
  }
  const p = L.hallPlatform
  if (x >= p.minX && x <= p.maxX && z >= p.minZ && z <= p.maxZ) return L.hall.floor
  const b = L.bellTower
  if (x >= b.minX && x <= b.maxX && z >= b.minZ && z <= b.maxZ) return b.floor
  const dx = x - L.bodhi.x
  const dz = z - L.bodhi.z
  if (dx * dx + dz * dz <= L.bodhi.platformR * L.bodhi.platformR) return L.bodhi.platformH
  return 0
}

export type ZoneId = 'loiVao' | 'tamQuan' | 'sanChua' | 'gacChuong' | 'boDe' | 'chinhDien' | 'vuonSau' | 'hoSen'

export const ZONE_NAMES: Record<ZoneId, string> = {
  loiVao: 'Lối vào chùa',
  tamQuan: 'Tam quan',
  sanChua: 'Sân chùa',
  gacChuong: 'Gác chuông',
  boDe: 'Cây bồ đề',
  chinhDien: 'Chính điện',
  vuonSau: 'Vườn sau',
  hoSen: 'Hồ sen',
}

export function zoneAt(x: number, z: number): ZoneId {
  const h = L.hall
  if (x >= h.minX && x <= h.maxX && z >= h.minZ && z <= h.maxZ + 0.4) return 'chinhDien'
  if (z > 28.5 && z < 31.5 && Math.abs(x) < 8) return 'tamQuan'
  if (z >= 31.5) {
    const dx = (x - L.pond.x) / (L.pond.rx + 3)
    const dz = (z - L.pond.z) / (L.pond.rz + 3)
    return dx * dx + dz * dz < 1 ? 'hoSen' : 'loiVao'
  }
  const b = L.bellTower
  if (x >= b.minX - 1 && x <= b.maxX + 1 && z >= b.minZ - 1 && z <= b.maxZ + 1) return 'gacChuong'
  const dx = x - L.bodhi.x
  const dz = z - L.bodhi.z
  if (dx * dx + dz * dz < 4.2 * 4.2) return 'boDe'
  if (z < -6.5) return 'vuonSau'
  return 'sanChua'
}

/** Vùng trang nghiêm: đi chậm, không chạy. */
export const isSacred = (zone: ZoneId) => zone === 'chinhDien'

const LANTERN_POLE_Z = [24, 18, 6, 0]

export const lanternPoles: Array<{ x: number; z: number }> = LANTERN_POLE_Z.flatMap((z) => [
  { x: -2.6, z },
  { x: 2.6, z },
])

export const hallColumns: Array<{ x: number; z: number }> = [
  ...[-8, -4.8, -1.6, 1.6, 4.8, 8].map((x) => ({ x, z: -9 })),
  ...[-4.8, 4.8].flatMap((x) => [
    { x, z: -12.3 },
    { x, z: -15.6 },
  ]),
]

export const bellColumns: Array<{ x: number; z: number }> = [
  { x: 8.6, z: 14.1 },
  { x: 12.4, z: 14.1 },
  { x: 8.6, z: 17.9 },
  { x: 12.4, z: 17.9 },
]

export const stoneLanterns: Array<{ x: number; z: number }> = [
  { x: -3.5, z: -4.9 },
  { x: 3.5, z: -4.9 },
  { x: -2.9, z: 35 },
  { x: 2.9, z: 35 },
]

export const bambooClusters: Array<{ x: number; z: number; r: number }> = [
  { x: -6, z: -27, r: 1.4 },
  { x: 6, z: -27.2, r: 1.4 },
  { x: -17, z: -24, r: 1.6 },
  { x: 19, z: -19, r: 1.4 },
  { x: -20, z: -12, r: 1.4 },
]

export const stupa = { x: 15, z: -25, r: 1.8 }

/** Chậu cây cảnh dọc hai bên sân. */
export const pots: Array<{ x: number; z: number }> = [23, 15, 7].flatMap((z) => [
  { x: -13.3, z },
  { x: 13.3, z },
])

/** Bồn hoa hai bên bậc thềm Chính điện. */
export const planters: Array<{ minX: number; maxX: number; minZ: number; maxZ: number }> = [
  { minX: -7.4, maxX: -5, minZ: -5.85, maxZ: -4.95 },
  { minX: 5, maxX: 7.4, minZ: -5.85, maxZ: -4.95 },
]

/** Cây tán tròn và cây cau trang trí (chỉ thân là vật cản). */
export const trees: Array<{ x: number; z: number; kind: 'round' | 'areca'; s: number }> = [
  { x: -15.5, z: 26, kind: 'round', s: 1.1 },
  { x: 15.5, z: 26, kind: 'round', s: 1.0 },
  { x: -15.2, z: -2.5, kind: 'round', s: 0.9 },
  { x: 15.4, z: -2.8, kind: 'round', s: 0.95 },
  { x: 9, z: 41, kind: 'round', s: 1.25 },
  { x: 17, z: 45, kind: 'round', s: 1.15 },
  { x: 21, z: 36.5, kind: 'round', s: 1.0 },
  { x: -23.5, z: 47, kind: 'round', s: 1.2 },
  { x: -10, z: -26, kind: 'round', s: 1.0 },
  { x: 9, z: -23, kind: 'round', s: 0.9 },
  { x: -20.5, z: 3, kind: 'round', s: 0.8 },
  { x: 20.5, z: 6, kind: 'round', s: 0.8 },
  { x: 4.6, z: 43, kind: 'areca', s: 1 },
  { x: -4.4, z: 47.5, kind: 'areca', s: 1.05 },
  { x: 4.5, z: 48.5, kind: 'areca', s: 0.95 },
  { x: 6.5, z: 33.5, kind: 'areca', s: 1.1 },
  { x: -12, z: 23, kind: 'areca', s: 1 },
  { x: 12.5, z: 22.5, kind: 'areca', s: 1.05 },
]

export function buildColliders(): Collider[] {
  const c: Collider[] = []
  // Tam quan: trụ cổng
  c.push(box(-4.2, -1.6, 29, 31), box(1.6, 4.2, 29, 31), box(-7.4, -6.2, 29, 31), box(6.2, 7.4, 29, 31))
  // Tường bao
  c.push(box(7.4, 24.4, 29.6, 30.4), box(-24.4, -7.4, 29.6, 30.4))
  c.push(box(23.6, 24.4, -30.4, 30.4), box(-24.4, -23.6, -30.4, 30.4), box(-24.4, 24.4, -30.4, -29.6))
  // Khoảng ngoài tường (không cho đi vòng ra sau)
  c.push(box(24.4, 40, -40, 30.4), box(-40, -24.4, -40, 30.4), box(-40, 40, -40, -30.4))
  // Hành lang hai bên sân
  c.push(box(16.8, 22.6, -4, 24), box(-22.6, -16.8, -4, 24))
  // Lư hương, cột cờ, cột đèn lồng, trụ biểu, đèn đá
  c.push(box(-0.95, 0.95, 11.05, 12.95))
  c.push(circle(L.flag.x, L.flag.z, 0.25))
  for (const p of lanternPoles) c.push(circle(p.x, p.z, 0.12))
  for (const s of stoneLanterns) c.push(circle(s.x, s.z, 0.38))
  // Gác chuông
  for (const p of bellColumns) c.push(circle(p.x, p.z, 0.2))
  c.push(circle(L.bell.x, L.bell.z, 0.75))
  // Cây bồ đề
  c.push(circle(L.bodhi.x, L.bodhi.z, 0.6))
  // Chính điện: tường, cột, bàn thờ, mõ, chuông gia trì
  const h = L.hall
  c.push(box(h.minX - 0.2, h.maxX + 0.2, h.minZ - 0.3, h.minZ + 0.1))
  c.push(box(h.maxX - 0.2, h.maxX + 0.2, h.minZ - 0.3, h.maxZ - 0.4), box(h.minX - 0.2, h.minX + 0.2, h.minZ - 0.3, h.maxZ - 0.4))
  c.push(box(4.8, 7.8, -9.15, -8.85), box(-7.8, -4.8, -9.15, -8.85))
  for (const col of hallColumns) c.push(circle(col.x, col.z, 0.25))
  c.push(box(L.altar.minX, L.altar.maxX, L.altar.minZ, L.altar.maxZ))
  c.push(circle(L.woodfish.x, L.woodfish.z, 0.35), circle(L.smallBell.x, L.smallBell.z, 0.3))
  // Mép nền Chính điện (chỉ lên được bằng bậc thềm)
  const p = L.hallPlatform
  c.push(box(p.minX - 0.1, L.stairs.minX, p.maxZ - 0.15, p.maxZ + 0.15), box(L.stairs.maxX, p.maxX + 0.1, p.maxZ - 0.15, p.maxZ + 0.15))
  c.push(box(p.minX - 0.15, p.minX + 0.15, p.minZ - 0.1, p.maxZ + 0.1), box(p.maxX - 0.15, p.maxX + 0.15, p.minZ - 0.1, p.maxZ + 0.1))
  c.push(box(p.minX - 0.1, p.maxX + 0.1, p.minZ - 0.15, p.minZ + 0.15))
  c.push(box(L.stairs.minX - 0.2, L.stairs.minX, L.stairs.minZ, L.stairs.maxZ), box(L.stairs.maxX, L.stairs.maxX + 0.2, L.stairs.minZ, L.stairs.maxZ))
  // Vườn sau
  for (const b of bambooClusters) c.push(circle(b.x, b.z, b.r))
  c.push(circle(stupa.x, stupa.z, stupa.r))
  for (const t of trees) c.push(circle(t.x, t.z, t.kind === 'round' ? 0.4 * t.s : 0.18))
  for (const p of pots) c.push(circle(p.x, p.z, 0.45))
  for (const p of planters) c.push(box(p.minX, p.maxX, p.minZ, p.maxZ))
  // Hồ sen
  c.push({ kind: 'ellipse', x: L.pond.x, z: L.pond.z, rx: L.pond.rx, rz: L.pond.rz })
  return c
}

/* ------------------------------------------------------------------ */
/* Điểm tương tác                                                        */
/* ------------------------------------------------------------------ */

export type InteractKind = 'incense' | 'bell' | 'woodfish' | 'worship' | 'meditate' | 'lantern' | 'info'

export interface Interactable {
  id: string
  kind: InteractKind
  label: string
  x: number
  z: number
  radius: number
  infoId?: InfoId
}

export type InfoId = 'tamQuan' | 'luHuong' | 'gacChuong' | 'boDe' | 'chinhDien' | 'hoSen'

export const plaques: Array<{ id: InfoId; x: number; z: number; yaw: number }> = [
  { id: 'tamQuan', x: 3.4, z: 33.6, yaw: -Math.PI / 2 },
  { id: 'luHuong', x: -2.8, z: 16.2, yaw: Math.PI / 2 },
  { id: 'gacChuong', x: 6.6, z: 13.6, yaw: -Math.PI / 2 },
  { id: 'boDe', x: -6.6, z: 3.6, yaw: Math.PI / 2 },
  { id: 'chinhDien', x: 5.2, z: -4.4, yaw: -Math.PI / 2 },
  { id: 'hoSen', x: -3.6, z: 36.2, yaw: Math.PI / 2 },
]

export const INFO: Record<InfoId, { title: string; body: string }> = {
  tamQuan: {
    title: 'Tam quan',
    body: 'Cổng chính của chùa, thường có ba lối đi. Theo cách giải thích phổ biến, ba cửa tượng trưng cho “tam giải thoát môn”: Không, Vô tướng, Vô tác. Bước qua Tam quan là bước vào một không gian tĩnh lặng hơn.',
  },
  luHuong: {
    title: 'Lư hương',
    body: 'Nén hương là cách bày tỏ lòng thành kính. Điều quan trọng là tâm thành, không nằm ở số lượng hương hay lễ vật. Khói hương bạn thắp sẽ bay lên cùng hương của những người khác trong sân.',
  },
  gacChuong: {
    title: 'Gác chuông',
    body: 'Tiếng chuông chùa nhắc người nghe dừng lại, trở về với hơi thở. Khi thỉnh chuông, nhiều chùa đọc bài kệ bắt đầu bằng “Văn chung thanh, phiền não khinh”: nghe tiếng chuông, phiền não nhẹ đi.',
  },
  boDe: {
    title: 'Cây bồ đề',
    body: 'Theo truyền thống, Đức Phật thành đạo dưới gốc cây bồ đề. Nhiều chùa Việt trồng cây bồ đề trong sân như một lời nhắc về sự tỉnh thức. Bạn có thể ngồi thiền trên bồ đoàn dưới gốc cây.',
  },
  chinhDien: {
    title: 'Chính điện',
    body: 'Chính điện, còn gọi là Đại hùng bảo điện, là nơi thờ Phật và là không gian trang nghiêm nhất của ngôi chùa. Khi vào Chính điện, xin đi nhẹ, nói khẽ.',
  },
  hoSen: {
    title: 'Hồ sen',
    body: 'Hoa sen mọc lên từ bùn mà không nhiễm mùi bùn, nên được xem là biểu tượng của sự thanh tịnh. Thả đèn hoa đăng là cách gửi lời cầu nguyện và lòng tri ân.',
  },
}

export const interactables: Interactable[] = [
  { id: 'incense', kind: 'incense', label: 'Thắp hương', x: L.burner.x, z: L.burner.z, radius: 2.9 },
  { id: 'bell', kind: 'bell', label: 'Thỉnh chuông', x: 8.9, z: 16.2, radius: 1.7 },
  { id: 'woodfish', kind: 'woodfish', label: 'Gõ mõ niệm Phật', x: -2.7, z: -14.9, radius: 1.25 },
  { id: 'worship', kind: 'worship', label: 'Lễ Phật', x: 0, z: -14.4, radius: 1.6 },
  { id: 'meditate', kind: 'meditate', label: 'Ngồi thiền', x: L.bodhi.x, z: L.bodhi.z, radius: 3.4 },
  { id: 'lantern', kind: 'lantern', label: 'Thả đèn hoa đăng', x: -4.9, z: 40, radius: 1.9 },
  ...plaques.map((p) => ({
    id: `info-${p.id}`,
    kind: 'info' as const,
    label: `Tìm hiểu: ${INFO[p.id].title}`,
    x: p.x,
    z: p.z,
    radius: 1.35,
    infoId: p.id,
  })),
]

/* ------------------------------------------------------------------ */
/* Chỗ đứng / ngồi cố định                                               */
/* ------------------------------------------------------------------ */

export interface Spot {
  x: number
  z: number
  yaw: number
}

const facing = (fromX: number, fromZ: number, toX: number, toZ: number) => Math.atan2(toX - fromX, toZ - fromZ)

export const SPOTS = {
  bell: { x: 8.85, z: 16.75, yaw: Math.PI / 2 } as Spot,
  woodfish: { x: -2.7, z: -14.85, yaw: Math.PI } as Spot,
  worshipPlayer: { x: 0, z: -14.6, yaw: Math.PI } as Spot,
  worshipBots: [
    { x: -1.25, z: -14.6, yaw: Math.PI },
    { x: 1.25, z: -14.6, yaw: Math.PI },
    { x: -1.25, z: -13.1, yaw: Math.PI },
    { x: 0, z: -13.1, yaw: Math.PI },
    { x: 1.25, z: -13.1, yaw: Math.PI },
  ] as Spot[],
  lanternPlayer: { x: -4.75, z: 40, yaw: -Math.PI / 2 } as Spot,
  lanternBots: { x: -5.25, z: 38.1, yaw: -Math.PI / 2 - 0.3 } as Spot,
  /** Bồ đoàn quanh gốc bồ đề, người ngồi quay lưng vào gốc cây */
  meditation: [0.35, 1.25, 2.2, 3.4, 4.4, 5.4].map((a) => {
    const x = L.bodhi.x + Math.cos(a) * 1.75
    const z = L.bodhi.z + Math.sin(a) * 1.75
    return { x, z, yaw: facing(L.bodhi.x, L.bodhi.z, x, z) }
  }) as Spot[],
}

/** Chỗ đứng quanh lư hương (bán kính 1.75m), hướng mặt vào lư hương. */
export function burnerSpot(angle: number): Spot {
  const x = L.burner.x + Math.sin(angle) * 1.75
  const z = L.burner.z + Math.cos(angle) * 1.75
  return { x, z, yaw: facing(x, z, L.burner.x, L.burner.z) }
}

/* ------------------------------------------------------------------ */
/* Đồ thị đường đi cho khách mô phỏng                                     */
/* ------------------------------------------------------------------ */

export const NODES: Record<string, [number, number]> = {
  spawn: [0, 49],
  approach: [0, 41],
  landing: [-5.1, 38.6],
  gateOut: [0, 32.6],
  gateIn: [0, 27.2],
  court: [0, 20.5],
  burnerFront: [0, 14.6],
  burnerE: [2.7, 12],
  burnerW: [-2.7, 12],
  burnerBack: [0, 9.3],
  bellApproach: [7.0, 16],
  bellSpot: [8.85, 16.75],
  bodhiApproach: [-6.3, 7.5],
  courtBack: [0, 2.2],
  stairsBottom: [0, -3.8],
  hallIn: [0, -10.2],
  hallMid: [0, -12.0],
  hallLeft: [-2.7, -13.6],
  eastSide: [12.5, 0],
  eastBack: [12.5, -24],
  backCenter: [0, -24.5],
  westBack: [-12.5, -24],
  westSide: [-12.5, -1],
}

export const EDGES: Array<[string, string]> = [
  ['spawn', 'approach'],
  ['approach', 'landing'],
  ['approach', 'gateOut'],
  ['gateOut', 'gateIn'],
  ['gateIn', 'court'],
  ['court', 'burnerFront'],
  ['court', 'bellApproach'],
  ['burnerFront', 'burnerE'],
  ['burnerFront', 'burnerW'],
  ['burnerE', 'burnerBack'],
  ['burnerW', 'burnerBack'],
  ['burnerE', 'bellApproach'],
  ['bellApproach', 'bellSpot'],
  ['burnerW', 'bodhiApproach'],
  ['bodhiApproach', 'courtBack'],
  ['burnerBack', 'courtBack'],
  ['courtBack', 'stairsBottom'],
  ['stairsBottom', 'hallIn'],
  ['hallIn', 'hallMid'],
  ['hallMid', 'hallLeft'],
  ['courtBack', 'eastSide'],
  ['eastSide', 'eastBack'],
  ['eastBack', 'backCenter'],
  ['backCenter', 'westBack'],
  ['westBack', 'westSide'],
  ['westSide', 'courtBack'],
  ['westSide', 'bodhiApproach'],
  ['bellApproach', 'eastSide'],
]

const adjacency: Record<string, string[]> = {}
for (const [a, b] of EDGES) {
  ;(adjacency[a] ??= []).push(b)
  ;(adjacency[b] ??= []).push(a)
}

export function nearestNode(x: number, z: number): string {
  let best = 'spawn'
  let bestD = Infinity
  for (const [id, [nx, nz]] of Object.entries(NODES)) {
    const d = (nx - x) ** 2 + (nz - z) ** 2
    if (d < bestD) {
      bestD = d
      best = id
    }
  }
  return best
}

/** Đường đi ngắn nhất (Dijkstra) trên đồ thị nút. */
export function findPath(from: string, to: string): string[] {
  if (from === to) return [to]
  const dist: Record<string, number> = { [from]: 0 }
  const prev: Record<string, string> = {}
  const open = new Set([from])
  while (open.size) {
    let cur = ''
    let curD = Infinity
    for (const n of open) {
      if ((dist[n] ?? Infinity) < curD) {
        curD = dist[n]
        cur = n
      }
    }
    open.delete(cur)
    if (cur === to) break
    for (const nb of adjacency[cur] ?? []) {
      const [ax, az] = NODES[cur]
      const [bx, bz] = NODES[nb]
      const nd = curD + Math.hypot(bx - ax, bz - az)
      if (nd < (dist[nb] ?? Infinity)) {
        dist[nb] = nd
        prev[nb] = cur
        open.add(nb)
      }
    }
  }
  if (!(to in prev)) return []
  const path = [to]
  let n = to
  while (prev[n] && prev[n] !== from) {
    n = prev[n]
    path.unshift(n)
  }
  return path
}
