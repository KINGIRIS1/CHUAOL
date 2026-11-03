import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { mulberry32 } from '../../lib/rng'

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!]
}

function toTexture(c: HTMLCanvasElement, repeat = true): CanvasTexture {
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  if (repeat) {
    t.wrapS = RepeatWrapping
    t.wrapT = RepeatWrapping
  }
  t.anisotropy = 4
  return t
}

const hsl = (h: number, s: number, l: number) => `hsl(${h}, ${s}%, ${l}%)`

/** Ngói mũi hài: các viên ngói xếp so le, đầu tròn hướng về phía mái hiên. */
export function roofTileTexture(): CanvasTexture {
  const S = 256
  const [c, g] = makeCanvas(S, S)
  const r = mulberry32(7)
  g.fillStyle = '#4a2418'
  g.fillRect(0, 0, S, S)
  const tw = 32
  const th = 26
  const rows = Math.ceil(S / th) + 2
  // Vẽ từ dưới lên: hàng phía trên canvas (gần mái hiên) phủ lên hàng phía dưới
  for (let row = rows; row >= -1; row--) {
    const y = row * th
    const off = row % 2 === 0 ? 0 : tw / 2
    for (let col = -1; col <= S / tw + 1; col++) {
      const x = col * tw + off
      const light = 24 + r() * 9
      const hue = 14 + r() * 8
      const grad = g.createLinearGradient(0, y - th, 0, y + 4)
      grad.addColorStop(0, hsl(hue, 40, light - 8))
      grad.addColorStop(0.7, hsl(hue, 42, light))
      grad.addColorStop(1, hsl(hue, 38, light + 5))
      g.fillStyle = grad
      g.beginPath()
      g.moveTo(x + 1, y + th)
      g.lineTo(x + 1, y)
      g.quadraticCurveTo(x + 1, y - th * 0.55, x + tw / 2, y - th * 0.62)
      g.quadraticCurveTo(x + tw - 1, y - th * 0.55, x + tw - 1, y)
      g.lineTo(x + tw - 1, y + th)
      g.closePath()
      g.fill()
      g.strokeStyle = 'rgba(30, 12, 6, 0.55)'
      g.lineWidth = 1.5
      g.stroke()
      if (r() < 0.12) {
        g.fillStyle = `rgba(70, 85, 45, ${0.25 + r() * 0.25})`
        g.beginPath()
        g.arc(x + r() * tw, y + r() * th * 0.5, 3 + r() * 6, 0, Math.PI * 2)
        g.fill()
      }
    }
  }
  return toTexture(c)
}

/** Gạch lát sân kiểu Bát Tràng: ô vuông đỏ gạch, mạch vữa sẫm. */
export function brickTexture(): CanvasTexture {
  const S = 256
  const [c, g] = makeCanvas(S, S)
  const r = mulberry32(11)
  g.fillStyle = '#5c3b2c'
  g.fillRect(0, 0, S, S)
  const n = 4
  const cell = S / n
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const l = 31 + r() * 8
      g.fillStyle = hsl(13 + r() * 7, 38 + r() * 10, l)
      g.fillRect(i * cell + 2, j * cell + 2, cell - 4, cell - 4)
      for (let k = 0; k < 60; k++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '255,230,200' : '40,20,10'}, ${0.04 + r() * 0.06})`
        g.fillRect(i * cell + 2 + r() * (cell - 6), j * cell + 2 + r() * (cell - 6), 2 + r() * 4, 2 + r() * 4)
      }
    }
  }
  return toTexture(c)
}

export function grassTexture(): CanvasTexture {
  const S = 256
  const [c, g] = makeCanvas(S, S)
  const r = mulberry32(3)
  g.fillStyle = '#4c6a30'
  g.fillRect(0, 0, S, S)
  for (let k = 0; k < 2600; k++) {
    const l = 20 + r() * 18
    g.strokeStyle = hsl(78 + r() * 26, 38 + r() * 18, l)
    g.lineWidth = 1 + r()
    const x = r() * S
    const y = r() * S
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (r() - 0.5) * 4, y - 3 - r() * 5)
    g.stroke()
  }
  for (let k = 0; k < 14; k++) {
    g.fillStyle = `rgba(120, 100, 60, ${0.08 + r() * 0.1})`
    g.beginPath()
    g.arc(r() * S, r() * S, 6 + r() * 18, 0, Math.PI * 2)
    g.fill()
  }
  return toTexture(c)
}

/** Đá lát lối đi: phiến đá chữ nhật xám. */
export function stoneTexture(): CanvasTexture {
  const S = 256
  const [c, g] = makeCanvas(S, S)
  const r = mulberry32(5)
  g.fillStyle = '#5b5852'
  g.fillRect(0, 0, S, S)
  const rowsH = [64, 64, 64, 64]
  let y = 0
  for (const h of rowsH) {
    let x = r() * -40
    while (x < S) {
      const w = 60 + r() * 50
      const l = 40 + r() * 10
      g.fillStyle = hsl(36 + r() * 10, 7 + r() * 6, l)
      g.fillRect(x + 2, y + 2, w - 4, h - 4)
      for (let k = 0; k < 40; k++) {
        g.fillStyle = `rgba(${r() < 0.5 ? '255,255,255' : '0,0,0'}, ${0.03 + r() * 0.05})`
        g.fillRect(x + 2 + r() * (w - 6), y + 2 + r() * (h - 6), 2 + r() * 3, 2 + r() * 3)
      }
      x += w
    }
    y += h
  }
  return toTexture(c)
}

/** Cờ Phật giáo: 5 sọc dọc (xanh, vàng, đỏ, trắng, cam) và sọc thứ 6 gồm 5 sọc ngang cùng màu. */
export function flagTexture(): CanvasTexture {
  const W = 300
  const H = 200
  const [c, g] = makeCanvas(W, H)
  const colors = ['#2f5fb3', '#f3c623', '#c8312b', '#f4f1ea', '#e8862a']
  const bw = W / 6
  colors.forEach((col, i) => {
    g.fillStyle = col
    g.fillRect(i * bw, 0, bw + 1, H)
  })
  colors.forEach((col, i) => {
    g.fillStyle = col
    g.fillRect(5 * bw, (i * H) / 5, bw + 1, H / 5 + 1)
  })
  return toTexture(c, false)
}

/** Bảng hoành phi sơn son thếp vàng. Vẽ lại sau khi font đã tải. */
export function plaqueTexture(text: string, w = 1024, h = 256): CanvasTexture {
  const [c, g] = makeCanvas(w, h)
  const tex = toTexture(c, false)
  const draw = () => {
    const grad = g.createLinearGradient(0, 0, 0, h)
    grad.addColorStop(0, '#5a1710')
    grad.addColorStop(1, '#3b0d08')
    g.fillStyle = grad
    g.fillRect(0, 0, w, h)
    g.strokeStyle = '#c9a14a'
    g.lineWidth = 14
    g.strokeRect(10, 10, w - 20, h - 20)
    g.lineWidth = 3
    g.strokeRect(30, 30, w - 60, h - 60)
    g.fillStyle = '#e2bd62'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    let size = h * 0.42
    g.font = `700 ${size}px Alegreya, Georgia, serif`
    while (g.measureText(text).width > w - 120 && size > 20) {
      size -= 4
      g.font = `700 ${size}px Alegreya, Georgia, serif`
    }
    g.shadowColor = 'rgba(0,0,0,0.5)'
    g.shadowOffsetY = 3
    g.fillText(text, w / 2, h / 2 + 4)
    g.shadowColor = 'transparent'
    tex.needsUpdate = true
  }
  draw()
  if (typeof document !== 'undefined' && document.fonts) {
    document.fonts.load('700 64px Alegreya').then(draw, () => {})
  }
  return tex
}

/** Đốm sáng tròn mềm, dùng cho đèn, nến, đom đóm. */
export function glowTexture(): CanvasTexture {
  const S = 64
  const [c, g] = makeCanvas(S, S)
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  return toTexture(c, false)
}

/** Bóng tròn mờ dưới chân người. */
export function blobTexture(): CanvasTexture {
  const S = 64
  const [c, g] = makeCanvas(S, S)
  const grad = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2)
  grad.addColorStop(0, 'rgba(0,0,0,0.6)')
  grad.addColorStop(0.6, 'rgba(0,0,0,0.25)')
  grad.addColorStop(1, 'rgba(0,0,0,0)')
  g.fillStyle = grad
  g.fillRect(0, 0, S, S)
  return toTexture(c, false)
}
