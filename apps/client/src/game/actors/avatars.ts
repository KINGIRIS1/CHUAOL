import { Color } from 'three'
import { pick } from '../../lib/rng'
import { type Avatar, zeroPose } from '../runtime'

export const BOT_NAMES = [
  'Minh Tâm', 'Diệu Hạnh', 'Thiện Nhân', 'An Nhiên', 'Bảo Ngọc', 'Minh Khang', 'Thu Hà', 'Gia Huy', 'Lan Anh', 'Đức Minh',
  'Hoài An', 'Phương Thảo', 'Quốc Bảo', 'Thanh Tâm', 'Hải Yến', 'Tuấn Kiệt', 'Ngọc Diệp', 'Khánh Linh', 'Việt Hoàng', 'Mai Chi',
  'Trung Hiếu', 'Diệu Linh', 'Bình An', 'Tâm Như', 'Hữu Phước', 'Kim Oanh', 'Văn Lộc', 'Thảo Vy', 'Nhật Minh', 'Huyền Trang',
  'Bích Liên', 'Hoàng Nam', 'Ngọc Hân', 'Thiên Ân', 'Mỹ Duyên', 'Phúc Khang', 'Như Ý', 'Quang Huy', 'Tường Vi', 'Đăng Khoa',
]

const ROBE_COLORS = ['#6f86a6', '#7c5a43', '#8d9096', '#e6dfcf', '#5d6f8f', '#9a7b5c', '#c2645a', '#d9b48f', '#a3b8a0', '#6b7b5e', '#b07a8c']
const SKIN = ['#e9c4a0', '#dcb08a', '#c99a74', '#f0d0b0', '#b8865e']
const HAIR = ['#1d1714', '#2a211b', '#3b2f27', '#1d1714', '#8c8c8c', '#c9c6c0']

export function createAvatar(id: number, name: string, isPlayer: boolean): Avatar {
  return {
    id,
    name,
    isPlayer,
    active: true,
    x: 0,
    y: 0,
    z: 0,
    yaw: 0,
    speed: 0,
    phase: Math.random() * 10,
    pose: zeroPose(),
    target: zeroPose(),
    robe: new Color(pick(ROBE_COLORS)),
    skin: new Color(pick(SKIN)),
    hair: new Color(pick(HAIR)),
    bubble: null,
    tapAt: -100,
    anchored: false,
  }
}

export function randomizeLook(a: Avatar): void {
  a.robe.set(pick(ROBE_COLORS))
  a.skin.set(pick(SKIN))
  a.hair.set(pick(HAIR))
}

/** Tăng mỗi khi màu áo/da của ai đó đổi để Crowd cập nhật màu instance. */
export const lookVersion = { value: 0 }

export const PHRASES = ['A Di Đà Phật', 'Chúc an lành', 'Xin cảm ơn', 'Mời bạn cùng thắp hương', 'Mời bạn cùng ngồi thiền'] as const

export function say(a: Avatar, text: string, now: number, seconds = 3.2): void {
  a.bubble = { text, until: now + seconds }
}
