import { L } from './layout'
import { audio } from './audio/engine'
import { runtime } from './runtime'

/* ================================ Hương ================================ */

export const MAX_STICKS = 180
export const STICK_LEN = 0.42
const STICK_LIFE = 240

/** Que hương cố định trên bát hương ở bàn thờ chính. */
export const ALTAR_STICKS = [-0.05, 0, 0.05].map((dx, i) => ({
  x: dx,
  z: -16.95 + (i - 1) * 0.01,
  y: L.altar.top + 0.15,
  tiltX: (i - 1) * 0.04,
  tiltZ: dx * 0.6,
}))

/** Cắm `n` nén hương vào lư hương, phía người đứng ở góc `angle`. */
export function addIncense(n: number, angle: number): void {
  const t = runtime.time
  for (let i = 0; i < n; i++) {
    const a = angle + (Math.random() - 0.5) * 0.9
    const d = 0.18 + Math.random() * 0.36
    runtime.incense.push({
      x: L.burner.x + Math.sin(a) * d,
      z: L.burner.z + Math.cos(a) * d,
      tiltX: (Math.random() - 0.5) * 0.12,
      tiltZ: (Math.random() - 0.5) * 0.12,
      born: t - Math.random() * 0.4,
      life: STICK_LIFE * (0.85 + Math.random() * 0.3),
    })
  }
  while (runtime.incense.length > MAX_STICKS) runtime.incense.shift()
}

export function stickProgress(born: number, life: number): number {
  return Math.min(1, (runtime.time - born) / life)
}

/** Độ dài còn lại của que hương (cháy dần còn 45%). */
export const stickRemain = (p: number) => 1 - 0.55 * p

export function updateIncense(): void {
  const t = runtime.time
  const list = runtime.incense
  let w = 0
  for (let i = 0; i < list.length; i++) {
    const s = list[i]
    if (t - s.born < s.life) list[w++] = s
  }
  list.length = w
}

/** Mồi sẵn một ít hương trong lư cho sân chùa không vắng vẻ lúc mới vào. */
export function seedIncense(n: number): void {
  for (let i = 0; i < n; i++) addIncense(1, Math.random() * Math.PI * 2)
  for (const s of runtime.incense) s.born = runtime.time - Math.random() * s.life * 0.8
}

/* ------------------------------- Khói hương ------------------------------- */

export const MAX_SMOKE = 320

export const smoke = {
  pos: new Float32Array(MAX_SMOKE * 3),
  vel: new Float32Array(MAX_SMOKE * 3),
  age: new Float32Array(MAX_SMOKE),
  life: new Float32Array(MAX_SMOKE).fill(1),
  size: new Float32Array(MAX_SMOKE),
  alpha: new Float32Array(MAX_SMOKE),
  seed: new Float32Array(MAX_SMOKE),
  cursor: 0,
  carry: 0,
  carryAltar: 0,
}

function emit(x: number, y: number, z: number, limit: number) {
  const i = smoke.cursor
  smoke.cursor = (smoke.cursor + 1) % limit
  smoke.pos[i * 3] = x
  smoke.pos[i * 3 + 1] = y
  smoke.pos[i * 3 + 2] = z
  smoke.vel[i * 3] = (Math.random() - 0.5) * 0.04
  smoke.vel[i * 3 + 1] = 0.28 + Math.random() * 0.16
  smoke.vel[i * 3 + 2] = (Math.random() - 0.5) * 0.04
  smoke.age[i] = 0
  smoke.life[i] = 3.2 + Math.random() * 2
  smoke.seed[i] = Math.random() * 100
}

export function stickTip(s: { x: number; z: number; tiltX: number; tiltZ: number }, remain: number, baseY: number): [number, number, number] {
  const len = STICK_LEN * remain
  return [s.x + Math.sin(s.tiltZ) * len, baseY + len, s.z + Math.sin(s.tiltX) * len]
}

export function updateSmoke(dt: number): void {
  const limit = Math.min(MAX_SMOKE, runtime.quality.smokeParticles)
  const sticks = runtime.incense
  if (sticks.length > 0) {
    smoke.carry += dt * Math.min(46, 5 + sticks.length * 0.6)
    while (smoke.carry >= 1) {
      smoke.carry -= 1
      const s = sticks[Math.floor(Math.random() * sticks.length)]
      const [x, y, z] = stickTip(s, stickRemain(stickProgress(s.born, s.life)), L.burner.top)
      emit(x, y, z, limit)
    }
  }
  smoke.carryAltar += dt * 4
  while (smoke.carryAltar >= 1) {
    smoke.carryAltar -= 1
    const s = ALTAR_STICKS[Math.floor(Math.random() * ALTAR_STICKS.length)]
    const [x, y, z] = stickTip(s, 0.8, s.y)
    emit(x, y, z, limit)
  }
  const t = runtime.time
  for (let i = 0; i < limit; i++) {
    const age = (smoke.age[i] += dt)
    const life = smoke.life[i]
    if (age >= life) {
      smoke.alpha[i] = 0
      continue
    }
    const k = age / life
    const sd = smoke.seed[i]
    smoke.vel[i * 3] += (Math.sin(t * 1.3 + sd) * 0.05 + 0.012) * dt
    smoke.vel[i * 3 + 2] += Math.cos(t * 1.1 + sd * 1.7) * 0.05 * dt
    smoke.vel[i * 3 + 1] *= 1 - 0.18 * dt
    smoke.pos[i * 3] += smoke.vel[i * 3] * dt
    smoke.pos[i * 3 + 1] += smoke.vel[i * 3 + 1] * dt
    smoke.pos[i * 3 + 2] += smoke.vel[i * 3 + 2] * dt
    smoke.size[i] = 0.05 + k * 0.55
    smoke.alpha[i] = Math.min(1, age / 0.35) * (1 - k) * 0.24
  }
  for (let i = limit; i < MAX_SMOKE; i++) smoke.alpha[i] = 0
}

/* ============================= Đèn hoa đăng ============================= */

export const MAX_LANTERNS = 60
const LANTERN_LIFE = 210

export function spawnLantern(byPlayer: boolean, x = -5.95, z = 40): void {
  runtime.lanterns.push({ x, z, heading: Math.PI + (Math.random() - 0.5) * 0.6, born: runtime.time, life: LANTERN_LIFE, seed: Math.random() * 100, byPlayer })
  while (runtime.lanterns.length > MAX_LANTERNS) runtime.lanterns.shift()
}

export function updateLanterns(dt: number): void {
  const P = L.pond
  const t = runtime.time
  const list = runtime.lanterns
  let w = 0
  for (let i = 0; i < list.length; i++) {
    const l = list[i]
    if (t - l.born >= l.life) continue
    l.heading += Math.sin(t * 0.27 + l.seed) * 0.22 * dt
    const ex = (l.x - P.x) / P.rx
    const ez = (l.z - P.z) / P.rz
    const r = Math.hypot(ex, ez)
    if (r > 0.72) {
      // Lái nhẹ về giữa hồ khi gần bờ
      const toCenter = Math.atan2(P.z - l.z, P.x - l.x)
      let d = toCenter - l.heading
      d = Math.atan2(Math.sin(d), Math.cos(d))
      l.heading += d * Math.min(1, (r - 0.72) * 4) * dt * 1.5
    }
    const speed = 0.16 + 0.04 * Math.sin(l.seed)
    l.x += Math.cos(l.heading) * speed * dt
    l.z += Math.sin(l.heading) * speed * dt
    list[w++] = l
  }
  list.length = w
}

export function seedLanterns(n: number): void {
  const P = L.pond
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const r = Math.sqrt(Math.random()) * 0.65
    spawnLantern(false, P.x + Math.cos(a) * r * P.rx, P.z + Math.sin(a) * r * P.rz)
    runtime.lanterns[runtime.lanterns.length - 1].born = runtime.time - Math.random() * LANTERN_LIFE * 0.6
  }
}

/* ================================ Chuông ================================ */

/** Thời điểm chày chạm chuông kể từ lúc bắt đầu kéo (giây). */
export const BELL_HIT_T = 0.8
const BELL_POS = { x: L.bell.x, y: L.bellTower.floor + L.bell.bottom + 0.8, z: L.bell.z }
let hitDone = true
let onPlayerRing: (() => void) | null = null

export function bellBusy(): boolean {
  return runtime.time - runtime.bell.strikeStart < 4.5
}

/** Bắt đầu một lần thỉnh chuông. Trả về false nếu chuông đang ngân dở. */
export function startBellStrike(byId: number, onRing?: () => void): boolean {
  if (bellBusy()) return false
  runtime.bell.strikeStart = runtime.time
  runtime.bell.strikeBy = byId
  hitDone = false
  onPlayerRing = onRing ?? null
  return true
}

export function updateBell(dt: number): void {
  const b = runtime.bell
  const t = runtime.time - b.strikeStart
  if (!hitDone && t >= BELL_HIT_T) {
    hitDone = true
    b.lastRing = runtime.time
    b.swingVel += 0.05
    audio.bell(BELL_POS, b.strikeBy === 0 ? 1 : 0.85)
    onPlayerRing?.()
    onPlayerRing = null
  }
  b.swingVel += (-b.swing * 7 - b.swingVel * 0.5) * dt
  b.swing += b.swingVel * dt
}

/** Độ lệch của chày gỗ theo trục x: kéo lùi rồi thả cho chạm vào chuông. */
export function strikerOffset(): number {
  const t = runtime.time - runtime.bell.strikeStart
  if (t < 0 || t > 3) return 0
  if (t < 0.55) {
    const k = t / 0.55
    return -0.55 * (1 - (1 - k) * (1 - k))
  }
  if (t < BELL_HIT_T) {
    const k = (t - 0.55) / (BELL_HIT_T - 0.55)
    return -0.55 + 0.57 * k * k
  }
  const k = t - BELL_HIT_T
  return 0.02 * Math.exp(-k * 3) * Math.cos(k * 9) - 0.12 * Math.sin(Math.min(1, k / 0.4) * Math.PI) * Math.exp(-k * 2)
}

export const BELL_VERSE = ['Văn chung thanh, phiền não khinh,', 'Trí tuệ trưởng, bồ đề sinh,', 'Ly địa ngục, xuất hỏa khanh,', 'Nguyện thành Phật, độ chúng sinh.']
export const BELL_VERSE_CAPTION = 'Kệ nghe chuông · nghe tiếng chuông, phiền não nhẹ đi, trí tuệ lớn lên'

export const WOODFISH_POS = { x: L.woodfish.x, y: L.hall.floor + 0.58, z: L.woodfish.z }
export const RECITATION = ['Nam', 'mô', 'A', 'Di', 'Đà', 'Phật']
