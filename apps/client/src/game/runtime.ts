import { Color, Vector3 } from 'three'
import { PRESETS, type QualityPreset } from '../config'
import type { Collider, InteractKind, Spot } from './layout'
import { buildColliders } from './layout'

/** Các tư thế được trộn với nhau (0..1) để tạo dáng cho người. */
export interface Pose {
  pray: number
  bow: number
  kneel: number
  prostrate: number
  sit: number
  reach: number
  strike: number
}

export const zeroPose = (): Pose => ({ pray: 0, bow: 0, kneel: 0, prostrate: 0, sit: 0, reach: 0, strike: 0 })

export interface Avatar {
  id: number
  name: string
  isPlayer: boolean
  active: boolean
  x: number
  y: number
  z: number
  yaw: number
  /** Tốc độ di chuyển hiện tại (m/s), dùng cho nhịp bước */
  speed: number
  phase: number
  pose: Pose
  target: Pose
  robe: Color
  skin: Color
  hair: Color
  bubble: { text: string; until: number } | null
  /** Thời điểm gõ mõ gần nhất (để tạo nhịp tay) */
  tapAt: number
  /** Đang ở yên một chỗ để hành lễ: không bị người khác đẩy */
  anchored: boolean
}

export interface IncenseStick {
  x: number
  z: number
  tiltX: number
  tiltZ: number
  born: number
  life: number
}

export interface FloatingLantern {
  x: number
  z: number
  heading: number
  born: number
  life: number
  seed: number
  byPlayer: boolean
}

export type ActivityPhase = 'approach' | 'setup' | 'perform' | 'active'

export interface PlayerActivity {
  kind: InteractKind
  phase: ActivityPhase
  /** Thời gian đã trôi trong pha hiện tại (giây) */
  t: number
  spot: Spot
  from: { x: number; z: number; yaw: number }
  nextPhase: ActivityPhase
  data: Record<string, number | string>
}

export type CameraMode = 'intro' | 'follow' | 'meditate'

export const runtime = {
  time: 0,
  /** Bước thời gian tối đa mỗi khung hình (giây); kiểm thử trên máy chậm có thể nới ra */
  maxDt: 0.05,
  started: false,
  colliders: buildColliders() as Collider[],
  avatars: [] as Avatar[],
  incense: [] as IncenseStick[],
  lanterns: [] as FloatingLantern[],
  bell: { lastRing: -100, swing: 0, swingVel: 0, strikeStart: -100, strikeBy: -1 },
  woodfish: { lastHit: -100 },
  env: {
    hour: 9,
    /** 0 = ban ngày, 1 = đêm hẳn */
    night: 0,
    sunDir: new Vector3(0.5, 0.8, 0.3),
  },
  camera: { yaw: 0, pitch: 0.3, dist: 6.5, mode: 'intro' as CameraMode, blend: 0 },
  activity: null as PlayerActivity | null,
  quality: PRESETS.medium as QualityPreset,
  perf: { fps: 0, ms: 0, calls: 0, tris: 0, dpr: 1 },
}

export function player(): Avatar {
  return runtime.avatars[0]
}
