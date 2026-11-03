/** Trạng thái điều khiển: bàn phím, joystick ảo, kéo xoay camera. */

export type Action = 'interact' | 'exit' | 'tap' | 'emotePray' | 'emoteBow'

export const input = {
  keys: new Set<string>(),
  joyX: 0,
  joyY: 0,
  /** Độ xoay camera tích lũy từ chuột/cảm ứng, GameLoop tiêu thụ mỗi khung hình */
  lookDX: 0,
  lookDY: 0,
  zoom: 0,
  lastMoveInput: 0,
}

type ActionHandler = (a: Action) => void
let handler: ActionHandler = () => {}

export function onAction(h: ActionHandler) {
  handler = h
}

export function dispatchAction(a: Action) {
  handler(a)
}

const isTyping = (e: KeyboardEvent) => {
  const t = e.target as HTMLElement | null
  return !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)
}

const MOVE_KEYS = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight'])

export function attachKeyboard(): () => void {
  const down = (e: KeyboardEvent) => {
    if (isTyping(e)) return
    if (MOVE_KEYS.has(e.code)) {
      input.keys.add(e.code)
      if (e.code.startsWith('Arrow')) e.preventDefault()
      return
    }
    if (e.repeat) return
    switch (e.code) {
      case 'KeyE':
      case 'Enter':
        dispatchAction('interact')
        break
      case 'Escape':
        dispatchAction('exit')
        break
      case 'Space':
        e.preventDefault()
        dispatchAction('tap')
        break
      case 'Digit1':
        dispatchAction('emotePray')
        break
      case 'Digit2':
        dispatchAction('emoteBow')
        break
    }
  }
  const up = (e: KeyboardEvent) => input.keys.delete(e.code)
  const blur = () => input.keys.clear()
  window.addEventListener('keydown', down)
  window.addEventListener('keyup', up)
  window.addEventListener('blur', blur)
  return () => {
    window.removeEventListener('keydown', down)
    window.removeEventListener('keyup', up)
    window.removeEventListener('blur', blur)
  }
}

/** Kéo chuột / vuốt để xoay camera, cuộn hoặc chụm hai ngón để thu phóng. */
export function attachPointerLook(el: HTMLElement): () => void {
  const pointers = new Map<number, { x: number; y: number }>()
  let pinchDist = 0
  const down = (e: PointerEvent) => {
    pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    el.setPointerCapture?.(e.pointerId)
    if (pointers.size === 2) {
      const [a, b] = [...pointers.values()]
      pinchDist = Math.hypot(a.x - b.x, a.y - b.y)
    }
  }
  const move = (e: PointerEvent) => {
    const p = pointers.get(e.pointerId)
    if (!p) return
    if (pointers.size === 2) {
      p.x = e.clientX
      p.y = e.clientY
      const [a, b] = [...pointers.values()]
      const d = Math.hypot(a.x - b.x, a.y - b.y)
      input.zoom += (pinchDist - d) * 0.02
      pinchDist = d
      return
    }
    input.lookDX += e.clientX - p.x
    input.lookDY += e.clientY - p.y
    p.x = e.clientX
    p.y = e.clientY
  }
  const up = (e: PointerEvent) => {
    pointers.delete(e.pointerId)
  }
  const wheel = (e: WheelEvent) => {
    e.preventDefault()
    input.zoom += Math.sign(e.deltaY) * 0.6
  }
  el.addEventListener('pointerdown', down)
  el.addEventListener('pointermove', move)
  el.addEventListener('pointerup', up)
  el.addEventListener('pointercancel', up)
  el.addEventListener('wheel', wheel, { passive: false })
  return () => {
    el.removeEventListener('pointerdown', down)
    el.removeEventListener('pointermove', move)
    el.removeEventListener('pointerup', up)
    el.removeEventListener('pointercancel', up)
    el.removeEventListener('wheel', wheel)
  }
}

/** Vector di chuyển theo khung tham chiếu camera: x = sang phải, y = tiến tới. */
export function moveVector(): { x: number; y: number; run: boolean } {
  const k = input.keys
  let x = input.joyX
  let y = input.joyY
  if (k.has('KeyW') || k.has('ArrowUp')) y += 1
  if (k.has('KeyS') || k.has('ArrowDown')) y -= 1
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1
  const len = Math.hypot(x, y)
  if (len > 1) {
    x /= len
    y /= len
  }
  return { x, y, run: k.has('ShiftLeft') || k.has('ShiftRight') }
}
