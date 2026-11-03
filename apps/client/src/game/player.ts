import { damp, dampAngle } from '../lib/rng'
import { updateActivity, updateEmote } from './activities'
import { resolveCircle } from './collision'
import { moveVector } from './input'
import { heightAt, isSacred, zoneAt } from './layout'
import { player, runtime } from './runtime'

const RADIUS = 0.28
let dirX = 0
let dirZ = -1

export function updatePlayer(dt: number): void {
  const a = player()
  if (runtime.activity) {
    updateActivity(dt)
    a.y = damp(a.y, heightAt(a.x, a.z), 14, dt)
    return
  }
  updateEmote()
  const mv = moveVector()
  const sacred = isSacred(zoneAt(a.x, a.z))
  // Trong Chính điện đi chậm, không chạy
  const maxSpeed = sacred ? 1.25 : mv.run ? 3.6 : 2.1
  const cy = runtime.camera.yaw
  const fx = -Math.sin(cy)
  const fz = -Math.cos(cy)
  const rx = Math.cos(cy)
  const rz = -Math.sin(cy)
  const mx = fx * mv.y + rx * mv.x
  const mz = fz * mv.y + rz * mv.x
  const mag = Math.hypot(mv.x, mv.y)
  if (mag > 0.05) {
    dirX = mx / (Math.hypot(mx, mz) || 1)
    dirZ = mz / (Math.hypot(mx, mz) || 1)
    a.yaw = dampAngle(a.yaw, Math.atan2(dirX, dirZ), 10, dt)
  }
  a.speed = damp(a.speed, mag * maxSpeed, mag > 0.05 ? 7 : 10, dt)
  if (a.speed < 0.01) a.speed = 0
  a.x += dirX * a.speed * dt
  a.z += dirZ * a.speed * dt
  resolveCircle(a, RADIUS, runtime.colliders)
  a.y = damp(a.y, heightAt(a.x, a.z), 14, dt)
  a.phase += dt * a.speed * 4.2
}
