import { MAX_AVATARS } from '../../config'
import { damp, dampAngle, pick, rand } from '../../lib/rng'
import { audio } from '../audio/engine'
import { resolveCircle } from '../collision'
import { L, NODES, SPOTS, type Spot, burnerSpot, findPath, heightAt, isSacred, nearestNode, zoneAt } from '../layout'
import { type Avatar, runtime, zeroPose } from '../runtime'
import { WOODFISH_POS, addIncense, bellBusy, spawnLantern, startBellStrike } from '../systems'
import { BOT_NAMES, PHRASES, createAvatar, lookVersion, randomizeLook, say } from './avatars'

type TaskKind = 'incense' | 'worship' | 'chant' | 'meditate' | 'bell' | 'lantern' | 'stroll' | 'leave'

interface Bot {
  a: Avatar
  speed: number
  lane: number
  task: TaskKind | null
  step: 'walk' | 'arrive' | 'act' | 'away'
  path: Array<[number, number]>
  final: Spot | null
  slot: string | null
  t: number
  dur: number
  count: number
  reactAt: number
  sayCooldown: number
}

export const bots: Bot[] = []
/** Chỗ ngồi/đứng đã có người giữ: slotId → id người giữ (0 = người chơi). */
export const slots = new Map<string, number>()

const WEIGHTS: Array<[TaskKind, number]> = [
  ['incense', 3],
  ['worship', 2],
  ['meditate', 1.6],
  ['stroll', 2],
  ['lantern', 1],
  ['chant', 0.5],
  ['bell', 0.45],
  ['leave', 0.6],
]

const STROLL_NODES = ['court', 'burnerFront', 'courtBack', 'eastSide', 'westSide', 'backCenter', 'approach', 'bodhiApproach', 'eastBack', 'westBack']
const RADIUS = 0.28

let nameCursor = Math.floor(Math.random() * BOT_NAMES.length)
const nextName = () => BOT_NAMES[nameCursor++ % BOT_NAMES.length]

export function setBotCount(n: number): void {
  const target = Math.max(0, Math.min(MAX_AVATARS - 1, n))
  while (bots.length > target) {
    const b = bots.pop()!
    releaseSlot(b)
    runtime.avatars.splice(runtime.avatars.indexOf(b.a), 1)
  }
  while (bots.length < target) {
    const a = createAvatar(runtime.avatars.length, nextName(), false)
    runtime.avatars.push(a)
    const b: Bot = { a, speed: rand(1.0, 1.45), lane: rand(-0.55, 0.55), task: null, step: 'walk', path: [], final: null, slot: null, t: 0, dur: 0, count: 0, reactAt: -1, sayCooldown: rand(5, 20) }
    bots.push(b)
    scatter(b)
  }
  runtime.avatars.forEach((a, i) => (a.id = i))
  lookVersion.value++
}

/** Đặt khách vào giữa một việc nào đó để sân chùa có người ngay khi mở game. */
function scatter(b: Bot) {
  chooseTask(b)
  if (b.final) {
    const skipWalk = Math.random() < 0.7 && b.task !== 'leave'
    if (skipWalk) {
      b.a.x = b.final.x
      b.a.z = b.final.z
      b.a.yaw = b.final.yaw
      b.path = []
      b.step = 'act'
      b.t = Math.random() * Math.max(2, b.dur * 0.7)
      b.a.anchored = b.task !== 'stroll'
    } else {
      const [x, z] = NODES[pick(STROLL_NODES)]
      b.a.x = x + rand(-1, 1)
      b.a.z = z + rand(-1, 1)
      b.path = findPath(nearestNode(b.a.x, b.a.z), targetNodeFor(b)).map((id) => NODES[id])
    }
  }
  b.a.y = heightAt(b.a.x, b.a.z)
}

function reserve(b: Bot, slot: string): boolean {
  if (slots.has(slot)) return false
  slots.set(slot, b.a.id)
  b.slot = slot
  return true
}

function releaseSlot(b: Bot) {
  if (b.slot && slots.get(b.slot) === b.a.id) slots.delete(b.slot)
  b.slot = null
}

function targetNodeFor(b: Bot): string {
  switch (b.task) {
    case 'incense':
      return 'burnerFront'
    case 'worship':
      return 'hallMid'
    case 'chant':
      return 'hallLeft'
    case 'meditate':
      return 'bodhiApproach'
    case 'bell':
      return 'bellApproach'
    case 'lantern':
      return 'landing'
    case 'leave':
      return 'spawn'
    default:
      return nearestNode(b.final?.x ?? 0, b.final?.z ?? 0)
  }
}

function chooseTask(b: Bot) {
  const total = WEIGHTS.reduce((s, [, w]) => s + w, 0)
  for (let attempt = 0; attempt < 6; attempt++) {
    let r = Math.random() * total
    let kind: TaskKind = 'stroll'
    for (const [k, w] of WEIGHTS) {
      r -= w
      if (r <= 0) {
        kind = k
        break
      }
    }
    if (assign(b, kind)) return
  }
  assign(b, 'stroll')
}

function assign(b: Bot, kind: TaskKind): boolean {
  b.final = null
  b.count = 0
  switch (kind) {
    case 'incense': {
      const ang = rand(-1.4, 1.4) + (Math.random() < 0.3 ? Math.PI : 0)
      b.final = burnerSpot(ang)
      b.dur = 6.5
      break
    }
    case 'worship': {
      const free = SPOTS.worshipBots.map((s, i) => [s, `worship-${i}`] as const).filter(([, id]) => !slots.has(id))
      if (!free.length) return false
      const [s, id] = pick(free)
      reserve(b, id)
      b.final = s
      b.dur = 12
      break
    }
    case 'chant':
      if (!reserve(b, 'woodfish')) return false
      b.final = SPOTS.woodfish
      b.dur = rand(18, 32)
      break
    case 'meditate': {
      const free = SPOTS.meditation.map((s, i) => [s, `med-${i}`] as const).filter(([, id]) => !slots.has(id))
      if (free.length <= 1) return false // luôn chừa một bồ đoàn cho người chơi
      const [s, id] = pick(free)
      reserve(b, id)
      b.final = s
      b.dur = rand(40, 110)
      break
    }
    case 'bell':
      if (!reserve(b, 'bell')) return false
      b.final = SPOTS.bell
      b.dur = 22
      break
    case 'lantern':
      if (!reserve(b, 'landing')) return false
      b.final = SPOTS.lanternBots
      b.dur = 7
      break
    case 'leave':
      b.final = { x: NODES.spawn[0] + rand(-1, 1), z: NODES.spawn[1], yaw: 0 }
      b.dur = rand(6, 14)
      break
    default: {
      const [x, z] = NODES[pick(STROLL_NODES)]
      b.final = { x: x + rand(-1.2, 1.2), z: z + rand(-1.2, 1.2), yaw: rand(-Math.PI, Math.PI) }
      b.dur = rand(3, 9)
    }
  }
  b.task = kind
  b.step = 'walk'
  b.t = 0
  b.path = findPath(nearestNode(b.a.x, b.a.z), targetNodeFor(b)).map((id) => NODES[id])
  return true
}

/** Người chơi cần chỗ này: khách đang giữ sẽ chắp tay rồi nhường. */
export function evictSlot(slot: string): void {
  const holder = slots.get(slot)
  if (holder === undefined || holder === 0) return
  const b = bots.find((x) => x.a.id === holder)
  if (b) finishTask(b)
  slots.delete(slot)
}

export function claimSlot(slot: string): void {
  evictSlot(slot)
  slots.set(slot, 0)
}

export function releasePlayerSlot(slot: string): void {
  if (slots.get(slot) === 0) slots.delete(slot)
}

function finishTask(b: Bot) {
  releaseSlot(b)
  b.a.target = zeroPose()
  b.a.anchored = false
  b.task = null
}

/** Người chơi vừa nói câu chào: vài khách gần đó đáp lại. */
export function greetNearby(x: number, z: number): void {
  const near = bots
    .filter((b) => b.a.active && Math.hypot(b.a.x - x, b.a.z - z) < 7)
    .sort((p, q) => Math.hypot(p.a.x - x, p.a.z - z) - Math.hypot(q.a.x - x, q.a.z - z))
    .slice(0, 3)
  for (const b of near) b.reactAt = runtime.time + rand(0.5, 1.8)
}

export function updateBots(dt: number): void {
  const now = runtime.time
  const me = runtime.avatars[0]
  for (const b of bots) {
    const a = b.a
    if (b.reactAt > 0 && now >= b.reactAt) {
      b.reactAt = -1
      say(a, 'A Di Đà Phật', now)
      if (b.step !== 'act') a.target.pray = 1
    }
    if (a.bubble && now > a.bubble.until) {
      a.bubble = null
      if (b.step !== 'act') a.target.pray = 0
    }
    b.sayCooldown -= dt
    if (me && b.sayCooldown <= 0 && a.active) {
      b.sayCooldown = rand(18, 45)
      const d = Math.hypot(a.x - me.x, a.z - me.z)
      if (d < 7 && Math.random() < 0.35) say(a, isSacred(zoneAt(a.x, a.z)) ? 'A Di Đà Phật' : pick(PHRASES.slice(0, 3)), now)
    }

    if (!b.task) chooseTask(b)
    if (b.step === 'walk') walk(b, dt)
    else if (b.step === 'arrive') {
      b.t += dt
      a.yaw = dampAngle(a.yaw, b.final!.yaw, 6, dt)
      a.x = damp(a.x, b.final!.x, 8, dt)
      a.z = damp(a.z, b.final!.z, 8, dt)
      a.speed = damp(a.speed, 0, 10, dt)
      if (b.t > 0.5) {
        b.step = 'act'
        b.t = 0
        a.anchored = b.task !== 'stroll' && b.task !== 'leave'
      }
    } else if (b.step === 'act') act(b, dt)
    else if (b.step === 'away') {
      b.t += dt
      if (b.t >= b.dur) respawn(b)
    }
    a.y = damp(a.y, heightAt(a.x, a.z), 12, dt)
  }
}

function walk(b: Bot, dt: number) {
  const a = b.a
  let tx: number
  let tz: number
  if (b.path.length) {
    ;[tx, tz] = b.path[0]
    // Lệch sang một bên đường để không đi thành hàng một
    const next = b.path[1]
    if (next) {
      const dx = next[0] - tx
      const dz = next[1] - tz
      const len = Math.hypot(dx, dz) || 1
      tx += (-dz / len) * b.lane
      tz += (dx / len) * b.lane
    }
  } else {
    tx = b.final!.x
    tz = b.final!.z
  }
  const dx = tx - a.x
  const dz = tz - a.z
  const d = Math.hypot(dx, dz)
  const arriveR = b.path.length ? 0.6 : 0.12
  if (d < arriveR) {
    if (b.path.length) b.path.shift()
    else {
      b.step = 'arrive'
      b.t = 0
    }
    return
  }
  const sacred = isSacred(zoneAt(a.x, a.z))
  const maxV = sacred ? Math.min(b.speed, 0.95) : b.speed
  const v = b.path.length ? maxV : Math.min(maxV, d * 2)
  a.speed = damp(a.speed, v, 5, dt)
  a.yaw = dampAngle(a.yaw, Math.atan2(dx, dz), 7, dt)
  const step = Math.min(d, a.speed * dt)
  a.x += (dx / d) * step
  a.z += (dz / d) * step
  a.phase += dt * a.speed * 4.4
  resolveCircle(a, RADIUS, runtime.colliders, 1)
}

function act(b: Bot, dt: number) {
  const a = b.a
  const tg = a.target
  b.t += dt
  const t = b.t
  a.speed = damp(a.speed, 0, 10, dt)
  switch (b.task) {
    case 'incense': {
      tg.reach = t < 1 ? 0.6 : 0
      tg.pray = t >= 1 && t < 4 ? 1 : 0
      if (b.count === 0 && t >= 4) {
        b.count = 1
        addIncense(Math.random() < 0.6 ? 3 : 1, Math.atan2(a.x - L.burner.x, a.z - L.burner.z))
      }
      tg.bow = t >= 4.2 && t < 6.2 ? 0.5 + 0.5 * Math.sin((t - 4.2) * Math.PI * 1.5 - Math.PI / 2) : 0
      break
    }
    case 'worship': {
      tg.kneel = t > 0.3 && t < b.dur - 0.8 ? 1 : 0
      const c = t - 1.2
      tg.prostrate = c > 0 && c < 9.6 ? Math.max(0, Math.sin((c / 3.2) * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5) : 0
      tg.pray = t > 0.3 && t < b.dur - 0.8 ? 1 - tg.prostrate : 0
      break
    }
    case 'chant': {
      tg.kneel = t < b.dur - 0.8 ? 1 : 0
      tg.strike = t < b.dur - 1 ? 1 : 0
      const beat = Math.floor((t - 1) / 0.72)
      if (t > 1 && t < b.dur - 1 && beat > b.count) {
        b.count = beat
        a.tapAt = runtime.time
        audio.woodfish(WOODFISH_POS, 0.6)
      }
      break
    }
    case 'meditate':
      tg.sit = t < b.dur - 0.8 ? 1 : 0
      break
    case 'bell': {
      tg.reach = runtime.bell.strikeBy === a.id && runtime.time - runtime.bell.strikeStart < 1.4 ? 1 : 0
      if (b.count < 3 && t > 1 + b.count * 7 && !bellBusy() && startBellStrike(a.id)) b.count++
      if (b.count >= 3 && t > 23) b.t = b.dur
      break
    }
    case 'lantern': {
      tg.kneel = t > 0.2 && t < 4.8 ? 1 : 0
      tg.bow = t > 1 && t < 2.4 ? 0.6 : 0
      tg.reach = 0
      if (b.count === 0 && t > 2.2) {
        b.count = 1
        spawnLantern(false, -6.1, 38.3)
      }
      break
    }
    case 'stroll':
      tg.pray = t > 1 && t < 3 && b.lane > 0.3 ? 1 : 0
      break
    case 'leave':
      a.active = false
      a.bubble = null
      b.step = 'away'
      b.t = 0
      return
  }
  if (t >= b.dur) finishTask(b)
}

function respawn(b: Bot) {
  const a = b.a
  a.name = nextName()
  randomizeLook(a)
  lookVersion.value++
  a.x = NODES.spawn[0] + rand(-1.5, 1.5)
  a.z = NODES.spawn[1] + rand(0, 1.5)
  a.yaw = Math.PI
  a.y = 0
  a.active = true
  a.target = zeroPose()
  a.pose = zeroPose()
  b.task = null
  b.speed = rand(1.0, 1.45)
}
