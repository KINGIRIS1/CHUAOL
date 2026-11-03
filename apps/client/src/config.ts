export type QualityLevel = 'low' | 'medium' | 'high'
export type QualityMode = 'auto' | QualityLevel
export type TimeMode = 'vn' | 'dawn' | 'day' | 'dusk' | 'night'

export interface QualityPreset {
  level: QualityLevel
  maxDpr: number
  shadows: boolean
  shadowMapSize: number
  avatarShadows: boolean
  smokeParticles: number
  fogFar: number
  pointLight: boolean
  nameTags: number
}

export const PRESETS: Record<QualityLevel, QualityPreset> = {
  low: { level: 'low', maxDpr: 1, shadows: false, shadowMapSize: 512, avatarShadows: false, smokeParticles: 110, fogFar: 150, pointLight: false, nameTags: 4 },
  medium: { level: 'medium', maxDpr: 1.5, shadows: true, shadowMapSize: 1024, avatarShadows: false, smokeParticles: 200, fogFar: 210, pointLight: true, nameTags: 6 },
  high: { level: 'high', maxDpr: 2, shadows: true, shadowMapSize: 2048, avatarShadows: true, smokeParticles: 300, fogFar: 260, pointLight: true, nameTags: 8 },
}

export const QUALITY_LABELS: Record<QualityMode, string> = { auto: 'Tự động', low: 'Thấp', medium: 'Trung bình', high: 'Cao' }

export const TIME_LABELS: Record<TimeMode, string> = {
  vn: 'Theo giờ Việt Nam',
  dawn: 'Bình minh',
  day: 'Ban ngày',
  dusk: 'Hoàng hôn',
  night: 'Ban đêm',
}

export const TIME_HOURS: Record<Exclude<TimeMode, 'vn'>, number> = { dawn: 5.9, day: 9.6, dusk: 17.55, night: 21.2 }

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia?.('(pointer: coarse)').matches || 'ontouchstart' in window
}

/** Đoán mức chất lượng ban đầu; sau đó GameLoop tự hạ/nâng theo FPS thực tế. */
export function detectQuality(): QualityLevel {
  if (typeof navigator === 'undefined') return 'medium'
  const cores = navigator.hardwareConcurrency || 4
  if (isTouchDevice()) return cores >= 8 ? 'medium' : 'low'
  return cores >= 8 ? 'high' : 'medium'
}

/** Tham số URL dành cho phát triển và kiểm thử (vd. ?bots=50&quality=low&perf=1&time=night&autostart=1). */
export interface UrlParams {
  bots?: number
  quality?: QualityMode
  time?: TimeMode
  perf: boolean
  autostart: boolean
}

export function readUrlParams(search: string = typeof location !== 'undefined' ? location.search : ''): UrlParams {
  const q = new URLSearchParams(search)
  const bots = q.get('bots')
  const quality = q.get('quality') as QualityMode | null
  const time = q.get('time') as TimeMode | null
  return {
    bots: bots !== null && !Number.isNaN(Number(bots)) ? Math.max(0, Math.min(80, Number(bots))) : undefined,
    quality: quality && quality in QUALITY_LABELS ? quality : undefined,
    time: time && time in TIME_LABELS ? time : undefined,
    perf: q.get('perf') === '1',
    autostart: q.get('autostart') === '1',
  }
}

export const MAX_AVATARS = 81
