import { useStore } from '../state/store'
import { dampAngle, lerp } from '../lib/rng'
import { audio } from './audio/engine'
import { claimSlot, greetNearby, releasePlayerSlot, slots } from './actors/bots'
import { PHRASES, say } from './actors/avatars'
import { input } from './input'
import { type Interactable, L, SPOTS, type Spot, burnerSpot, interactables, isSacred, zoneAt } from './layout'
import { type PlayerActivity, player, runtime, zeroPose } from './runtime'
import { BELL_VERSE, BELL_VERSE_CAPTION, RECITATION, WOODFISH_POS, addIncense, bellBusy, spawnLantern, startBellStrike } from './systems'

const APPROACH_T = 0.65
const store = () => useStore.getState()

/* --------------------------- Tìm điểm tương tác --------------------------- */

export function findInteractable(x: number, z: number): Interactable | null {
  let best: Interactable | null = null
  let bestD = Infinity
  for (const it of interactables) {
    const d = Math.hypot(it.x - x, it.z - z)
    if (d <= it.radius && d < bestD) {
      best = it
      bestD = d
    }
  }
  return best
}

/** Bồ đoàn gần người chơi nhất; nếu khách đang ngồi thì khách sẽ nhường (claimSlot). */
function nearestMeditationSpot(x: number, z: number): { spot: Spot; slot: string } {
  let best = 0
  let bestD = Infinity
  SPOTS.meditation.forEach((s, i) => {
    const d = Math.hypot(s.x - x, s.z - z)
    if (d < bestD) {
      bestD = d
      best = i
    }
  })
  return { spot: SPOTS.meditation[best], slot: `med-${best}` }
}

/** Chọn góc máy thiền nằm trong khoảng sân trống, tránh tường và chậu cây. */
function meditationCameraAngle(spot: Spot): number {
  const c = L.courtyard
  for (const off of [0.55, -0.55, 1.2, -1.2, 1.9, -1.9]) {
    const a = spot.yaw + off
    const x = spot.x + Math.sin(a) * 4.6
    const z = spot.z + Math.cos(a) * 4.6
    if (x > c.minX + 1.8 && x < c.maxX - 1.8 && z > c.minZ + 1 && z < c.maxZ - 1) return off
  }
  return 0.55
}

/* ------------------------------- Bắt đầu ------------------------------- */

function begin(kind: PlayerActivity['kind'], spot: Spot, nextPhase: PlayerActivity['nextPhase'], data: PlayerActivity['data'] = {}) {
  const a = player()
  runtime.activity = { kind, phase: 'approach', t: 0, spot, from: { x: a.x, z: a.z, yaw: a.yaw }, nextPhase, data }
  a.anchored = true
  store().setActivity({ kind, phase: 'approach' })
  store().setPrompt(null)
}

export function interact(): void {
  const act = runtime.activity
  if (act) {
    if (act.kind === 'bell' && act.phase === 'active') ringAgain()
    else if (act.kind === 'woodfish' && act.phase === 'active') tapWoodfish()
    return
  }
  if (!runtime.started) return
  const a = player()
  const it = findInteractable(a.x, a.z)
  if (!it) return
  audio.chime()
  switch (it.kind) {
    case 'incense': {
      const ang = Math.atan2(a.x - L.burner.x, a.z - L.burner.z)
      begin('incense', burnerSpot(ang), 'setup')
      break
    }
    case 'bell':
      claimSlot('bell')
      begin('bell', SPOTS.bell, 'active', { slot: 'bell' })
      break
    case 'woodfish':
      claimSlot('woodfish')
      begin('woodfish', SPOTS.woodfish, 'active', { slot: 'woodfish' })
      break
    case 'worship':
      begin('worship', SPOTS.worshipPlayer, 'perform')
      break
    case 'meditate': {
      const { spot, slot } = nearestMeditationSpot(a.x, a.z)
      claimSlot(slot)
      begin('meditate', spot, 'setup', { slot, camOffset: meditationCameraAngle(spot) })
      break
    }
    case 'lantern':
      begin('lantern', SPOTS.lanternPlayer, 'setup')
      break
    case 'info':
      if (it.infoId) store().setInfo(it.infoId)
      break
  }
}

/** Người chơi xác nhận ở bảng chuẩn bị (lời nguyện, số nén hương, thời gian thiền). */
export function confirmSetup(data: Record<string, number | string>): void {
  const act = runtime.activity
  if (!act || act.phase !== 'setup') return
  Object.assign(act.data, data)
  setPhase(act, act.kind === 'meditate' ? 'active' : 'perform')
  if (act.kind === 'meditate') {
    runtime.camera.mode = 'meditate'
    audio.smallBell(undefined, 0.9)
  }
}

function setPhase(act: PlayerActivity, phase: PlayerActivity['phase']) {
  act.phase = phase
  act.t = 0
  store().setActivity({ kind: act.kind, phase })
  if (act.kind === 'bell' && phase === 'active') ringAgain(true)
  if (act.kind === 'woodfish' && phase === 'active') store().setChant({ count: 0, syllable: -1 })
  if (act.kind === 'worship' && phase === 'perform') store().setWorship({ count: 0 })
}

export function exitActivity(): void {
  const act = runtime.activity
  if (!act) {
    if (store().info) store().setInfo(null)
    return
  }
  if (act.kind === 'meditate' && act.phase === 'active' && act.t >= 20) {
    store().addJournal({ meditationSec: Math.floor(act.t) })
    store().showToast(`Bạn đã ngồi thiền ${formatMinutes(act.t)}.`)
  }
  end()
}

function end() {
  const act = runtime.activity
  if (act?.data.slot) releasePlayerSlot(String(act.data.slot))
  runtime.activity = null
  runtime.camera.mode = 'follow'
  const a = player()
  a.target = zeroPose()
  a.anchored = false
  store().setActivity(null)
}

/* ------------------------------ Thao tác phụ ------------------------------ */

let versesShown = false

export function ringAgain(first = false): void {
  const act = runtime.activity
  if (!act || act.kind !== 'bell') return
  if (bellBusy()) {
    if (!first) store().showToast('Đợi tiếng chuông ngân hết rồi hãy thỉnh tiếp.')
    else act.data.pending = 1
    return
  }
  startBellStrike(0, () => {
    store().addJournal({ bellRings: 1 })
    if (!versesShown) {
      versesShown = true
      store().showVerse(BELL_VERSE, BELL_VERSE_CAPTION)
    }
  })
  act.data.lastStrike = runtime.time
}

export function tapWoodfish(): void {
  const act = runtime.activity
  if (!act || act.kind !== 'woodfish' || act.phase !== 'active') return
  const a = player()
  a.tapAt = runtime.time
  audio.woodfish(WOODFISH_POS, 1)
  const { count, syllable } = store().chant
  const last = RECITATION.length - 1
  // Gõ tiếp sau chữ cuối thì bắt đầu một câu niệm mới
  const next = (syllable >= last ? -1 : syllable) + 1
  act.data.reset = 0
  if (next === last) {
    store().setChant({ count: count + 1, syllable: last })
    store().addJournal({ recitations: 1 })
    act.data.reset = runtime.time + 0.9
  } else {
    store().setChant({ count, syllable: next })
  }
}

let emoteUntil = 0
let emoteKind: 'pray' | 'bow' | null = null

export function emote(kind: 'pray' | 'bow'): void {
  if (runtime.activity || !runtime.started) return
  emoteKind = kind
  emoteUntil = runtime.time + (kind === 'pray' ? 2.6 : 2.0)
}

export function speak(text: string): void {
  if (!runtime.started) return
  const a = player()
  say(a, text, runtime.time)
  if (text === PHRASES[0] || text === PHRASES[1]) greetNearby(a.x, a.z)
  emote('pray')
}

const formatMinutes = (sec: number) => {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return m > 0 ? `${m} phút${s ? ` ${s} giây` : ''}` : `${s} giây`
}

/* ------------------------------- Cập nhật ------------------------------- */

const pulse = (t: number, period: number) => 0.5 - 0.5 * Math.cos((t / period) * Math.PI * 2)

/** Gọi mỗi khung hình khi người chơi đang làm một hoạt động. */
export function updateActivity(dt: number): void {
  const act = runtime.activity!
  const a = player()
  const tg = a.target
  act.t += dt
  const t = act.t

  // Cử động joystick/phím di chuyển khi đang ở pha chuẩn bị hoặc hành lễ sẽ rời khỏi hoạt động
  if (act.phase !== 'approach' && (Math.abs(input.joyX) + Math.abs(input.joyY) > 0.35 || hasMoveKey())) {
    exitActivity()
    return
  }

  if (act.phase === 'approach') {
    const k = Math.min(1, t / APPROACH_T)
    const e = k * k * (3 - 2 * k)
    a.x = lerp(act.from.x, act.spot.x, e)
    a.z = lerp(act.from.z, act.spot.z, e)
    a.yaw = dampAngle(a.yaw, act.spot.yaw, 9, dt)
    a.speed = k < 1 ? Math.hypot(act.spot.x - act.from.x, act.spot.z - act.from.z) / APPROACH_T : 0
    a.phase += dt * a.speed * 4.2
    if (k >= 1) setPhase(act, act.nextPhase)
    return
  }
  a.speed = 0
  a.yaw = dampAngle(a.yaw, act.spot.yaw, 6, dt)

  switch (act.kind) {
    case 'incense': {
      if (act.phase !== 'perform') break
      tg.reach = t < 1.2 ? 0.55 : 0
      tg.pray = t >= 1.2 && t < 4.4 ? 1 : 0
      if (t >= 0.3 && !act.data.lit) {
        act.data.lit = 1
        audio.incense({ x: a.x, y: 1.4, z: a.z })
      }
      if (t >= 4.4 && !act.data.placed) {
        act.data.placed = 1
        const n = Number(act.data.sticks) || 3
        addIncense(n, Math.atan2(a.x - L.burner.x, a.z - L.burner.z))
        store().addJournal({ incenseSticks: n })
      }
      tg.bow = t >= 4.6 && t < 7.6 ? pulse(t - 4.6, 1) : 0
      if (t >= 8) {
        store().showToast('Nén hương đã được thắp. Cầu mong bình an.')
        end()
      }
      break
    }
    case 'bell': {
      const since = runtime.time - runtime.bell.strikeStart
      tg.reach = runtime.bell.strikeBy === 0 && since < 1.3 ? 1 : 0
      if (act.data.pending && !bellBusy()) {
        act.data.pending = 0
        ringAgain(true)
      }
      break
    }
    case 'woodfish': {
      tg.kneel = 1
      tg.strike = 1
      tg.pray = 0
      if (act.data.reset && runtime.time >= Number(act.data.reset)) {
        act.data.reset = 0
        store().setChant({ count: store().chant.count, syllable: -1 })
      }
      break
    }
    case 'worship': {
      tg.kneel = t > 0.2 && t < 10.9 ? 1 : 0
      const c = t - 1
      const n = Math.floor(c / 3.2)
      tg.prostrate = c > 0 && c < 9.6 ? pulse(c, 3.2) : 0
      tg.pray = t > 0.2 && t < 10.9 ? 1 - tg.prostrate : 0
      const done = c < 0 ? 0 : Math.min(3, n + (c % 3.2 > 1.6 ? 1 : 0))
      if (done !== store().worship.count) store().setWorship({ count: done })
      if (t >= 11.6) {
        store().addJournal({ prostrations: 3 })
        store().showToast('Kính lạy Đức Phật.')
        end()
      }
      break
    }
    case 'meditate': {
      tg.sit = 1
      if (act.phase !== 'active') break
      const dur = Number(act.data.minutes) * 60
      if (t >= dur && !act.data.ending) {
        act.data.ending = 1
        audio.smallBell(undefined, 0.8)
        setTimeout(() => audio.smallBell(undefined, 0.7), 2600)
        setTimeout(() => audio.smallBell(undefined, 0.6), 5200)
        store().addJournal({ meditationSec: Math.floor(dur) })
        store().showToast(`Bạn đã ngồi thiền ${formatMinutes(dur)}. Mong bạn an lạc.`)
        end()
      }
      break
    }
    case 'lantern': {
      if (act.phase !== 'perform') {
        tg.kneel = 0
        break
      }
      tg.kneel = t > 0.2 && t < 4.4 ? 1 : 0
      tg.bow = t > 0.9 && t < 2.2 ? 0.65 : 0
      tg.pray = t > 2.5 && t < 4.2 ? 1 : 0
      if (t >= 2.0 && !act.data.released) {
        act.data.released = 1
        spawnLantern(true)
        audio.plop({ x: -5.95, y: 0.1, z: 40 })
        store().addJournal({ lanterns: 1 })
      }
      if (t >= 4.8) {
        store().showToast('Đèn hoa đăng đã trôi ra giữa hồ.')
        end()
      }
      break
    }
    default:
      break
  }
}

function hasMoveKey(): boolean {
  for (const k of input.keys) if (k.startsWith('Key') || k.startsWith('Arrow')) return true
  return false
}

/** Cử chỉ chào khi đang đi lại tự do. */
export function updateEmote(): void {
  const a = player()
  if (emoteKind && runtime.time > emoteUntil) emoteKind = null
  if (Math.hypot(input.joyX, input.joyY) > 0.2 || hasMoveKey()) emoteKind = null
  const remain = emoteUntil - runtime.time
  a.target.pray = emoteKind === 'pray' ? 1 : 0
  a.target.bow = emoteKind === 'bow' ? (remain > 0.6 ? 1 : 0) : 0
  a.target.kneel = 0
  a.target.sit = 0
  a.target.prostrate = 0
  a.target.reach = 0
  a.target.strike = 0
}

/** Nhãn gợi ý cho điểm tương tác (có tính đến vùng trang nghiêm). */
export function promptFor(it: Interactable): string {
  if (it.kind === 'meditate') return 'Ngồi thiền dưới gốc bồ đề'
  if (it.kind === 'bell' && slots.get('bell') !== undefined && slots.get('bell') !== 0) return 'Thỉnh chuông (mời người khác nhường)'
  return it.label
}

export const sacredHere = () => {
  const a = player()
  return isSacred(zoneAt(a.x, a.z))
}
