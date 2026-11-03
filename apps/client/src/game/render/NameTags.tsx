import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { CanvasTexture, SRGBColorSpace, Sprite, SpriteMaterial } from 'three'
import { hipHeight } from '../actors/avatarRig'
import { type Avatar, runtime } from '../runtime'

type Label = { tex: CanvasTexture; aspect: number }
const cache = new Map<string, Label>()

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

function label(text: string, kind: 'name' | 'bubble'): Label {
  const key = `${kind}:${text}`
  const hit = cache.get(key)
  if (hit) return hit
  const H = 96
  const font = kind === 'name' ? `600 38px "Be Vietnam Pro", system-ui, sans-serif` : `600 40px "Be Vietnam Pro", system-ui, sans-serif`
  const c = document.createElement('canvas')
  const g = c.getContext('2d')!
  g.font = font
  const w = Math.ceil(g.measureText(text).width) + 56
  c.width = w
  c.height = H + (kind === 'bubble' ? 18 : 0)
  g.font = font
  if (kind === 'name') {
    g.fillStyle = 'rgba(28, 19, 14, 0.62)'
    roundRect(g, 2, 14, w - 4, H - 28, 30)
    g.fill()
    g.fillStyle = '#f2e8d5'
  } else {
    g.fillStyle = 'rgba(244, 236, 220, 0.96)'
    roundRect(g, 2, 4, w - 4, H - 8, 34)
    g.fill()
    g.beginPath()
    g.moveTo(w / 2 - 14, H - 6)
    g.lineTo(w / 2, H + 14)
    g.lineTo(w / 2 + 14, H - 6)
    g.fill()
    g.fillStyle = '#3a2416'
  }
  g.textAlign = 'center'
  g.textBaseline = 'middle'
  g.fillText(text, w / 2, kind === 'name' ? H / 2 + 1 : H / 2)
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  const l = { tex, aspect: c.width / c.height }
  cache.set(key, l)
  return l
}

/** Xóa bộ đệm nhãn khi font vừa tải xong để vẽ lại đúng mặt chữ. */
export function resetLabelCache() {
  for (const l of cache.values()) l.tex.dispose()
  cache.clear()
}

const NAME_POOL = 10
const BUBBLE_POOL = 8

function headTop(a: Avatar) {
  return a.y + hipHeight(a.pose) + 0.64 + 0.36 - a.pose.prostrate * 0.4
}

export function NameTags() {
  const { scene, camera } = useThree()
  const pools = useMemo(() => {
    const mk = (n: number) =>
      Array.from({ length: n }, () => {
        const s = new Sprite(new SpriteMaterial({ transparent: true, depthWrite: false, fog: false }))
        s.visible = false
        s.renderOrder = 20
        scene.add(s)
        return s
      })
    return { names: mk(NAME_POOL), bubbles: mk(BUBBLE_POOL) }
  }, [scene])

  useFrame(() => {
    const cam = camera.position
    const list = runtime.avatars
    const maxTags = runtime.quality.nameTags
    const near: Array<[number, Avatar]> = []
    for (let i = 1; i < list.length; i++) {
      const a = list[i]
      if (!a.active) continue
      const d = Math.hypot(a.x - cam.x, a.z - cam.z)
      if (d < 15) near.push([d, a])
    }
    near.sort((p, q) => p[0] - q[0])
    pools.names.forEach((s, i) => {
      const item = i < maxTags ? near[i] : undefined
      if (!item) {
        s.visible = false
        return
      }
      const a = item[1]
      const l = label(a.name, 'name')
      const m = s.material as SpriteMaterial
      if (m.map !== l.tex) {
        m.map = l.tex
        m.needsUpdate = true
      }
      const h = 0.24
      s.scale.set(h * l.aspect, h, 1)
      s.position.set(a.x, headTop(a) + 0.16, a.z)
      m.opacity = Math.min(1, (15 - item[0]) / 4)
      s.visible = true
    })
    let b = 0
    for (const a of list) {
      if (!a.active || !a.bubble || b >= BUBBLE_POOL) continue
      const s = pools.bubbles[b++]
      const l = label(a.bubble.text, 'bubble')
      const m = s.material as SpriteMaterial
      if (m.map !== l.tex) {
        m.map = l.tex
        m.needsUpdate = true
      }
      const h = 0.3
      s.scale.set(h * l.aspect, h, 1)
      s.position.set(a.x, headTop(a) + 0.5, a.z)
      m.opacity = Math.min(1, (a.bubble.until - runtime.time) / 0.4)
      s.visible = true
    }
    for (; b < BUBBLE_POOL; b++) pools.bubbles[b].visible = false
  })
  return null
}
