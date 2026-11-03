import { BoxGeometry, Mesh, MeshBasicMaterial, type PerspectiveCamera, Raycaster, Vector3 } from 'three'
import { clamp, damp, dampAngle, lerp } from '../lib/rng'
import { input } from './input'
import { heightAt } from './layout'
import { player, runtime } from './runtime'
import { CAMERA_BLOCKERS } from './world/architecture'

const blockers: Mesh[] = CAMERA_BLOCKERS.map(([x0, x1, y0, y1, z0, z1]) => {
  const m = new Mesh(new BoxGeometry(x1 - x0, y1 - y0, z1 - z0), new MeshBasicMaterial())
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
  m.updateMatrixWorld(true)
  return m
})

const ray = new Raycaster()
const target = new Vector3()
const desired = new Vector3()
const dir = new Vector3()
const look = new Vector3(0, 3, 6)
const introPos = new Vector3()
let introLookFrom = new Vector3()
let transition = 1

/** Gọi khi người chơi bấm "Bước vào chùa" để camera bay từ cảnh toàn về sau lưng nhân vật. */
export function beginFollow(cam: PerspectiveCamera): void {
  introPos.copy(cam.position)
  introLookFrom = look.clone()
  transition = 0
  runtime.camera.mode = 'follow'
  runtime.camera.yaw = player().yaw + Math.PI
}

function collide(from: Vector3, to: Vector3): Vector3 {
  dir.subVectors(to, from)
  const len = dir.length()
  if (len < 1e-3) return to
  dir.divideScalar(len)
  ray.set(from, dir)
  ray.far = len
  const hit = ray.intersectObjects(blockers, false)[0]
  if (hit) to.copy(from).addScaledVector(dir, Math.max(0.6, hit.distance - 0.3))
  const ground = heightAt(to.x, to.z) + 0.3
  if (to.y < ground) to.y = ground
  return to
}

export function updateCamera(cam: PerspectiveCamera, dt: number): void {
  const c = runtime.camera
  const t = runtime.time

  if (c.mode === 'intro') {
    const ang = t * 0.035 + 0.6
    desired.set(Math.sin(ang) * 36, 16 + Math.sin(t * 0.05) * 2, 8 + Math.cos(ang) * 36)
    cam.position.lerp(desired, 1 - Math.exp(-dt * 2))
    look.set(0, 3, 6)
    cam.lookAt(look)
    input.lookDX = 0
    input.lookDY = 0
    input.zoom = 0
    return
  }

  const a = player()
  c.yaw -= input.lookDX * 0.0055
  c.pitch = clamp(c.pitch + input.lookDY * 0.004, -0.12, 1.15)
  c.dist = clamp(c.dist + input.zoom * 0.6, 2.2, 14)
  input.lookDX = 0
  input.lookDY = 0
  input.zoom = 0

  const act = runtime.activity
  let dist = c.dist
  let pitch = c.pitch
  let headY = 1.45
  if (act && act.phase !== 'approach' && c.mode !== 'meditate') {
    // Khi hành lễ: camera tự vòng ra sau lưng và lại gần hơn
    c.yaw = dampAngle(c.yaw, act.spot.yaw + Math.PI, 2.2, dt)
    dist = Math.min(dist, act.kind === 'bell' ? 5.2 : 3.8)
    pitch = lerp(pitch, act.kind === 'bell' ? 0.15 : 0.32, 0.6)
    if (act.kind === 'woodfish' || act.kind === 'worship' || act.kind === 'lantern') headY = 1.1
  }

  target.set(a.x, a.y + headY, a.z)
  if (c.mode === 'meditate' && act) {
    // Góc máy tĩnh phía trước, chầm chậm trôi
    const ang = act.spot.yaw + (Number(act.data.camOffset) || 0.55) + Math.sin(t * 0.05) * 0.2
    desired.set(a.x + Math.sin(ang) * 4.6, a.y + 1.5, a.z + Math.cos(ang) * 4.6)
    target.set(a.x, a.y + 0.8, a.z)
  } else {
    const cp = Math.cos(pitch)
    desired.set(target.x + Math.sin(c.yaw) * cp * dist, target.y + Math.sin(pitch) * dist + 0.3, target.z + Math.cos(c.yaw) * cp * dist)
  }
  collide(target, desired)

  if (transition < 1) {
    transition = Math.min(1, transition + dt / 1.8)
    const e = transition * transition * (3 - 2 * transition)
    cam.position.lerpVectors(introPos, desired, e)
    look.lerpVectors(introLookFrom, target, e)
  } else {
    const k = 1 - Math.exp(-dt * 10)
    cam.position.lerp(desired, k)
    look.x = damp(look.x, target.x, 14, dt)
    look.y = damp(look.y, target.y, 14, dt)
    look.z = damp(look.z, target.z, 14, dt)
  }
  cam.lookAt(look)
}
