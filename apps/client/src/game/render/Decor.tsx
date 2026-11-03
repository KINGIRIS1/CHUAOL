import { useFrame, useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { DoubleSide, MeshStandardMaterial, type PerspectiveCamera, PlaneGeometry } from 'three'
import { L, lanternPoles, stoneLanterns } from '../layout'
import { runtime } from '../runtime'
import { getMaterials } from '../world/materials'
import { flagTexture } from '../world/textures'
import { pointScale } from './Incense'
import { markDirty, pointsGeometry, pointsMaterial } from './points'

/** Cờ Phật giáo bay trong gió (sóng tạo trong vertex shader). */
export function Flag() {
  const uTime = useMemo(() => ({ value: 0 }), [])
  const geo = useMemo(() => new PlaneGeometry(1.8, 1.2, 20, 8).translate(0.9, 0, 0), [])
  const mat = useMemo(() => {
    const m = new MeshStandardMaterial({ map: flagTexture(), side: DoubleSide, roughness: 0.9 })
    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uTime
      shader.vertexShader = 'uniform float uTime;\n' + shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float k = uv.x;
         transformed.z += sin(uv.x * 7.0 - uTime * 3.2) * 0.13 * k + sin(uv.y * 3.0 + uTime * 1.7) * 0.04 * k;
         transformed.y -= 0.06 * k * k;`,
      )
    }
    return m
  }, [uTime])
  useFrame(() => {
    uTime.value = runtime.time
  })
  return <mesh geometry={geo} material={mat} position={[L.flag.x + 0.05, 7.05, L.flag.z]} rotation-y={-0.5} />
}

const CANDLES: Array<[number, number, number]> = [
  [-2.35, L.altar.top + 0.72, -16.95],
  [2.35, L.altar.top + 0.72, -16.95],
]

/** Đốm sáng của đèn lồng, đèn đá, nến bàn thờ và đom đóm ban đêm. */
export function Glows() {
  const { camera, gl } = useThree()
  const FIREFLIES = 36
  const statics = useMemo(() => {
    const items: Array<[number, number, number, number, number]> = [] // x, y, z, size, theo đêm?
    for (const p of lanternPoles) items.push([p.x + (p.x > 0 ? -0.42 : 0.42), 2.11, p.z, 1.5, 1])
    for (const s of stoneLanterns) items.push([s.x, 1.08, s.z, 0.9, 1])
    for (const c of CANDLES) items.push([...c, 0.22, 0])
    const b = pointsGeometry(items.length + FIREFLIES)
    items.forEach(([x, y, z, size, night], i) => {
      b.position.set([x, y, z], i * 3)
      b.size[i] = size
      b.alpha[i] = night ? 0.9 : 1
      b.night[i] = night
    })
    return { b, count: items.length, seeds: Array.from({ length: FIREFLIES }, () => Math.random() * 100) }
  }, [])
  const warm = useMemo(() => pointsMaterial({ additive: true, color: '#ffb36b' }), [])
  const mats = getMaterials()

  useFrame(() => {
    const night = runtime.env.night
    const t = runtime.time
    warm.uniforms.uNight.value = 0.12 + night * 0.88
    warm.uniforms.uScale.value = pointScale(camera as PerspectiveCamera, gl.domElement.height)
    const { b, count, seeds } = statics
    // Đom đóm quanh hồ sen và gốc bồ đề
    for (let i = 0; i < seeds.length; i++) {
      const s = seeds[i]
      const home = i % 2 ? { x: L.pond.x, z: L.pond.z, r: 6 } : { x: L.bodhi.x, z: L.bodhi.z, r: 4 }
      const a = s + t * 0.07
      const k = count + i
      b.position.set(
        [home.x + Math.cos(a * 1.3) * home.r * (0.4 + 0.5 * Math.sin(s)), 0.6 + Math.sin(t * 0.5 + s) * 0.5 + (s % 1.5), home.z + Math.sin(a) * home.r * (0.4 + 0.5 * Math.cos(s))],
        k * 3,
      )
      b.size[k] = 0.12
      b.alpha[k] = Math.max(0, night - 0.4) * 1.6 * (0.5 + 0.5 * Math.sin(t * 2.2 + s * 7))
      b.night[k] = 0
    }
    markDirty(b.geometry, 'position', 'aAlpha')
    ;(mats.lantern as MeshStandardMaterial).emissiveIntensity = 0.25 + night * 2.4
    ;(mats.candle as MeshStandardMaterial).emissiveIntensity = 0.35 + night * 0.7
  })
  return <points geometry={statics.b.geometry} material={warm} frustumCulled={false} renderOrder={5} />
}
