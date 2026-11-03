import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { CylinderGeometry, type Group, LatheGeometry, type Mesh, MeshStandardMaterial, TorusGeometry, Vector2 } from 'three'
import { L } from '../layout'
import { runtime } from '../runtime'
import { strikerOffset } from '../systems'
import { plainMaterial } from '../world/materials'

const PIVOT_Y = 3.32
const STRIKER_Y = 2.45
const STRIKER_REST_X = 9.27
const ROPE_LEN = PIVOT_Y - STRIKER_Y
const BELL_H = 1.57

/** Đại hồng chung treo trên xà, chày gỗ treo bằng hai sợi dây. */
export function BellRig() {
  const bell = useRef<Group>(null!)
  const striker = useRef<Mesh>(null!)
  const ropes = [useRef<Mesh>(null!), useRef<Mesh>(null!)]
  const geo = useMemo(
    () => ({
      bell: new LatheGeometry(
        [
          new Vector2(0.62, 0),
          new Vector2(0.6, 0.08),
          new Vector2(0.55, 0.3),
          new Vector2(0.5, 0.7),
          new Vector2(0.47, 1.1),
          new Vector2(0.44, 1.35),
          new Vector2(0.35, 1.5),
          new Vector2(0.15, 1.56),
          new Vector2(0.001, BELL_H),
        ],
        32,
      ),
      bands: [0.22, 0.85, 1.3].map((y) => ({ y, g: new TorusGeometry(y < 0.5 ? 0.565 : y < 1 ? 0.49 : 0.445, 0.022, 6, 40) })),
      hook: new TorusGeometry(0.11, 0.035, 8, 16),
      striker: new CylinderGeometry(0.11, 0.11, 1.4, 12).rotateZ(Math.PI / 2),
      rope: new CylinderGeometry(0.012, 0.012, 1, 4).translate(0, -0.5, 0),
    }),
    [],
  )
  const mats = useMemo(() => ({ bronze: plainMaterial('bronze'), wood: plainMaterial('wood') }), [])
  const ropeMat = useMemo(() => new MeshStandardMaterial({ color: '#b39a72', roughness: 1 }), [])

  useFrame(() => {
    bell.current.rotation.z = -runtime.bell.swing
    const dx = strikerOffset()
    const lift = ROPE_LEN - Math.sqrt(Math.max(0, ROPE_LEN * ROPE_LEN - dx * dx))
    striker.current.position.set(STRIKER_REST_X + dx, STRIKER_Y + lift, L.bell.z)
    const angle = Math.asin(Math.max(-1, Math.min(1, dx / ROPE_LEN)))
    ropes.forEach((r, i) => {
      r.current.position.set(STRIKER_REST_X + (i ? 0.5 : -0.5), PIVOT_Y, L.bell.z)
      r.current.rotation.z = angle
      r.current.scale.y = ROPE_LEN
    })
  })

  return (
    <group>
      <group ref={bell} position={[L.bell.x, PIVOT_Y, L.bell.z]}>
        <group position={[0, -BELL_H - 0.06, 0]}>
          <mesh geometry={geo.bell} material={mats.bronze} castShadow receiveShadow />
          {geo.bands.map((b) => (
            <mesh key={b.y} geometry={b.g} material={mats.bronze} position={[0, b.y, 0]} rotation-x={Math.PI / 2} />
          ))}
        </group>
        <mesh geometry={geo.hook} material={mats.bronze} position={[0, -0.05, 0]} />
      </group>
      <mesh ref={striker} geometry={geo.striker} material={mats.wood} castShadow />
      <mesh ref={ropes[0]} geometry={geo.rope} material={ropeMat} />
      <mesh ref={ropes[1]} geometry={geo.rope} material={ropeMat} />
    </group>
  )
}
