import { Euler, Matrix4, Quaternion, Vector3 } from 'three'
import { clamp, damp, lerp } from '../../lib/rng'
import type { Avatar, Pose } from '../runtime'

/**
 * Dựng tư thế người từ các tham số trộn (Pose) thành ma trận cho từng bộ phận.
 * Mọi người trong chùa dùng chung một bộ hình khối → vẽ bằng instancing (mỗi bộ phận 1 draw call).
 */

export interface RigOut {
  robe: Matrix4
  torso: Matrix4
  head: Matrix4
  hair: Matrix4
  limbs: [Matrix4, Matrix4, Matrix4, Matrix4]
  hands: [Matrix4, Matrix4]
  blob: Matrix4
}

export const newRigOut = (): RigOut => ({
  robe: new Matrix4(),
  torso: new Matrix4(),
  head: new Matrix4(),
  hair: new Matrix4(),
  limbs: [new Matrix4(), new Matrix4(), new Matrix4(), new Matrix4()],
  hands: [new Matrix4(), new Matrix4()],
  blob: new Matrix4(),
})

const UPPER = 0.27
const FORE = 0.26
const Y = new Vector3(0, 1, 0)
const ONE = new Vector3(1, 1, 1)

const root = new Matrix4()
const local = new Matrix4()
const torsoLocal = new Matrix4()
const headLocal = new Matrix4()
const tmpM = new Matrix4()
const q = new Quaternion()
const e = new Euler()
const v = new Vector3()
const sc = new Vector3()
const shoulder = new Vector3()
const target = new Vector3()
const tTmp = new Vector3()
const pole = new Vector3()
const dir = new Vector3()
const elbow = new Vector3()
const hand = new Vector3()
const torsoRot = new Quaternion()

/** Tốc độ chuyển tư thế (1/giây). */
const POSE_RATE = 4.5

export function blendPose(a: Avatar, dt: number): void {
  const p = a.pose
  const t = a.target
  for (const k of Object.keys(p) as Array<keyof Pose>) p[k] = damp(p[k], t[k], POSE_RATE, dt)
}

/** Chiều cao hông theo tư thế (dùng cho nhãn tên). */
export function hipHeight(p: Pose): number {
  const kneel = Math.max(p.kneel, p.prostrate) * (1 - p.sit)
  return lerp(lerp(0.86, 0.47, kneel), 0.25, p.sit)
}

function segmentMatrix(out: Matrix4, a: Vector3, b: Vector3, r: number) {
  dir.subVectors(b, a)
  const len = dir.length() || 1e-4
  dir.divideScalar(len)
  q.setFromUnitVectors(Y, dir)
  local.compose(a, q, sc.set(r, len, r))
  out.multiplyMatrices(root, local)
}

export function computeRig(a: Avatar, time: number, out: RigOut): void {
  if (!a.active) {
    const zero = tmpM.makeScale(0, 0, 0)
    out.robe.copy(zero)
    out.torso.copy(zero)
    out.head.copy(zero)
    out.hair.copy(zero)
    for (const m of out.limbs) m.copy(zero)
    for (const m of out.hands) m.copy(zero)
    out.blob.copy(zero)
    return
  }
  const p = a.pose
  const sit = clamp(p.sit, 0, 1)
  const kneel = clamp(Math.max(p.kneel, p.prostrate), 0, 1) * (1 - sit)
  const walk = clamp(a.speed / 1.6, 0, 1) * (1 - kneel) * (1 - sit)
  const ph = a.phase
  const bob = Math.abs(Math.sin(ph)) * 0.035 * walk
  root.compose(v.set(a.x, a.y + bob, a.z), q.setFromAxisAngle(Y, a.yaw), ONE)

  const hip = hipHeight(p)

  // Áo dài phần dưới: kéo từ đất lên tới hông, xòe ra khi quỳ/ngồi
  const sx = lerp(lerp(1, 1.12, kneel), 1.9, sit)
  const sz = lerp(lerp(1, 1.45, kneel), 1.55, sit)
  local.compose(v.set(0, 0, kneel * 0.1 + sit * 0.04), q.identity(), sc.set(sx, hip, sz))
  out.robe.multiplyMatrices(root, local)

  // Thân trên: cúi chào, lạy, nhịp thở
  const breath = Math.sin(time * 1.4 + a.id) * 0.006
  const bend = p.bow * 0.62 + p.prostrate * 1.18 + p.pray * 0.05 + walk * 0.05
  const roll = Math.sin(ph) * 0.035 * walk
  torsoRot.setFromEuler(e.set(bend, 0, roll))
  torsoLocal.compose(v.set(0, hip, p.prostrate * 0.06), torsoRot, sc.set(1, 1 + breath, 1))
  out.torso.multiplyMatrices(root, torsoLocal)

  // Đầu và tóc
  const nod = p.bow * 0.32 + p.pray * 0.16 + sit * 0.1 - p.prostrate * 0.35
  headLocal.makeTranslation(0, 0.64, 0)
  headLocal.multiply(tmpM.makeRotationX(nod))
  headLocal.multiply(tmpM.makeTranslation(0, 0.12, 0.012))
  out.head.multiplyMatrices(out.torso, headLocal)
  local.makeTranslation(0, 0.018, -0.014).multiply(tmpM.makeRotationX(-0.35))
  out.hair.multiplyMatrices(out.head, local)

  // Hai tay: IK hai đốt trong không gian của người (trước khi nhân root)
  for (let k = 0; k < 2; k++) {
    const side = k === 0 ? -1 : 1
    shoulder.set(side * 0.2, 0.56, 0).applyMatrix4(torsoLocal)
    const swing = Math.sin(ph) * 0.15 * walk * side
    // Đích của bàn tay trong hệ của thân
    target.set(side * 0.24, 0.05, 0.05 + swing)
    target.lerp(tTmp.set(side * 0.03, 0.38, 0.21), clamp(p.pray, 0, 1))
    target.lerp(tTmp.set(side * 0.05, 0.08, 0.22), sit * (1 - p.pray * 0.5))
    target.lerp(tTmp.set(side * 0.14, 0.88, 0.34), clamp(p.reach, 0, 1))
    if (p.strike > 0.001) {
      // Tay phải cầm dùi: hạ xuống thật nhanh khi gõ rồi nhấc lên lại
      const since = time - a.tapAt
      const down = since < 0 ? 0 : since < 0.05 ? since / 0.05 : Math.exp(-(since - 0.05) * 9)
      const s = side > 0 ? tTmp.set(0.16, 0.36 - 0.13 * down, 0.44) : tTmp.set(-0.12, 0.14, 0.3)
      target.lerp(s, clamp(p.strike, 0, 1))
    }
    target.applyMatrix4(torsoLocal)
    // Lạy: hai tay chạm đất phía trước
    target.lerp(tTmp.set(side * 0.2, 0.06, 0.64), clamp(p.prostrate, 0, 1))
    pole.set(side * 0.7, -0.35, -0.6).applyQuaternion(torsoRot)

    dir.subVectors(target, shoulder)
    const dist = clamp(dir.length(), 0.08, UPPER + FORE - 0.005)
    dir.normalize()
    const along = (UPPER * UPPER - FORE * FORE + dist * dist) / (2 * dist)
    const h = Math.sqrt(Math.max(0, UPPER * UPPER - along * along))
    pole.addScaledVector(dir, -pole.dot(dir)).normalize()
    elbow.copy(shoulder).addScaledVector(dir, along).addScaledVector(pole, h)
    hand.copy(shoulder).addScaledVector(dir, dist)

    segmentMatrix(out.limbs[k * 2], shoulder, elbow, 0.055)
    segmentMatrix(out.limbs[k * 2 + 1], elbow, hand, 0.047)
    local.compose(hand, q.identity(), ONE)
    out.hands[k].multiplyMatrices(root, local)
  }

  // Bóng tròn dưới chân
  const bs = 0.95 + sit * 0.5 + kneel * 0.25
  out.blob.compose(v.set(a.x, a.y + 0.025, a.z), q.identity(), sc.set(bs, 1, bs))
}
