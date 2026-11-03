import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { BufferAttribute, Color, CylinderGeometry, Euler, type InstancedMesh, Matrix4, MeshStandardMaterial, type PerspectiveCamera, Quaternion, Vector3 } from 'three'
import { L } from '../layout'
import { runtime } from '../runtime'
import { ALTAR_STICKS, MAX_SMOKE, MAX_STICKS, STICK_LEN, smoke, stickProgress, stickRemain, stickTip } from '../systems'
import { markDirty, pointsGeometry, pointsMaterial } from './points'

const m = new Matrix4()
const q = new Quaternion()
const e = new Euler()
const p = new Vector3()
const s = new Vector3()
const smokeDay = new Color('#dcd6cc')
const smokeNight = new Color('#8b92a6')

export function pointScale(cam: PerspectiveCamera, heightPx: number) {
  return heightPx / (2 * Math.tan((cam.fov * Math.PI) / 360))
}

/** Que hương trong lư hương và bát hương bàn thờ, đốm lửa đầu hương, khói. */
export function Incense() {
  const { camera, gl } = useThree()
  const total = MAX_STICKS + ALTAR_STICKS.length
  const stickGeo = useMemo(() => new CylinderGeometry(0.0055, 0.0065, STICK_LEN, 5, 1).translate(0, STICK_LEN / 2, 0), [])
  const stickMat = useMemo(() => new MeshStandardMaterial({ color: '#94402a', roughness: 0.85 }), [])
  const sticks = useRef<InstancedMesh>(null!)
  const tips = useMemo(() => pointsGeometry(total), [total])
  const tipMat = useMemo(() => pointsMaterial({ additive: true, color: '#ff7b30' }), [])
  const smokeGeo = useMemo(() => {
    const b = pointsGeometry(MAX_SMOKE)
    b.geometry.setAttribute('position', new BufferAttribute(smoke.pos, 3))
    b.geometry.setAttribute('aSize', new BufferAttribute(smoke.size, 1))
    b.geometry.setAttribute('aAlpha', new BufferAttribute(smoke.alpha, 1))
    return b.geometry
  }, [])
  const smokeMat = useMemo(() => pointsMaterial({ color: '#dcd6cc' }), [])

  useFrame(() => {
    const list = runtime.incense
    let i = 0
    const flick = 0.85 + 0.15 * Math.sin(runtime.time * 13)
    for (const st of list) {
      const remain = stickRemain(stickProgress(st.born, st.life))
      q.setFromEuler(e.set(st.tiltX, 0, -st.tiltZ))
      m.compose(p.set(st.x, L.burner.top, st.z), q, s.set(1, remain, 1))
      sticks.current.setMatrixAt(i, m)
      const [tx, ty, tz] = stickTip(st, remain, L.burner.top)
      tips.position.set([tx, ty, tz], i * 3)
      tips.size[i] = 0.045
      tips.alpha[i] = flick
      i++
    }
    for (const st of ALTAR_STICKS) {
      q.setFromEuler(e.set(st.tiltX, 0, -st.tiltZ))
      m.compose(p.set(st.x, st.y, st.z), q, s.set(1, 0.8, 1))
      sticks.current.setMatrixAt(i, m)
      const [tx, ty, tz] = stickTip(st, 0.8, st.y)
      tips.position.set([tx, ty, tz], i * 3)
      tips.size[i] = 0.04
      tips.alpha[i] = flick
      i++
    }
    for (let k = i; k < total; k++) tips.alpha[k] = 0
    sticks.current.count = i
    sticks.current.instanceMatrix.needsUpdate = true
    markDirty(tips.geometry, 'position', 'aAlpha', 'aSize')
    markDirty(smokeGeo, 'position', 'aSize', 'aAlpha')
    const scale = pointScale(camera as PerspectiveCamera, gl.domElement.height)
    tipMat.uniforms.uScale.value = scale
    smokeMat.uniforms.uScale.value = scale
    smokeMat.uniforms.uColor.value.copy(smokeDay).lerp(smokeNight, runtime.env.night)
    tipMat.uniforms.uIntensity.value = 1 + runtime.env.night
  })

  return (
    <group>
      <instancedMesh ref={sticks} args={[stickGeo, stickMat, total]} frustumCulled={false} />
      <points geometry={tips.geometry} material={tipMat} frustumCulled={false} renderOrder={5} />
      <points geometry={smokeGeo} material={smokeMat} frustumCulled={false} renderOrder={6} />
    </group>
  )
}
