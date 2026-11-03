import { useRef } from 'react'
import { input } from '../game/input'

/** Joystick ảo cho màn hình cảm ứng: kéo núm để đi theo hướng camera. */
export function Joystick() {
  const base = useRef<HTMLDivElement>(null)
  const knob = useRef<HTMLDivElement>(null)
  const active = useRef<number | null>(null)

  const update = (e: React.PointerEvent) => {
    const r = base.current!.getBoundingClientRect()
    const cx = r.left + r.width / 2
    const cy = r.top + r.height / 2
    let dx = e.clientX - cx
    let dy = e.clientY - cy
    const max = r.width / 2 - 10
    const len = Math.hypot(dx, dy)
    if (len > max) {
      dx = (dx / len) * max
      dy = (dy / len) * max
    }
    knob.current!.style.transform = `translate(${dx}px, ${dy}px)`
    input.joyX = dx / max
    input.joyY = -dy / max
  }
  const reset = () => {
    active.current = null
    input.joyX = 0
    input.joyY = 0
    if (knob.current) knob.current.style.transform = ''
  }

  return (
    <div
      ref={base}
      className="joystick"
      aria-label="Điều khiển di chuyển"
      onPointerDown={(e) => {
        active.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        update(e)
      }}
      onPointerMove={(e) => {
        if (active.current === e.pointerId) update(e)
      }}
      onPointerUp={reset}
      onPointerCancel={reset}
    >
      <div ref={knob} className="knob" />
    </div>
  )
}
