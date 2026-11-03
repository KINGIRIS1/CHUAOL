import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  Color,
  CylinderGeometry,
  type InstancedMesh,
  LatheGeometry,
  MeshBasicMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  Vector2,
} from 'three'
import { MAX_AVATARS } from '../../config'
import { computeRig, newRigOut } from '../actors/avatarRig'
import { lookVersion } from '../actors/avatars'
import { runtime } from '../runtime'
import { blobTexture } from '../world/textures'

const WHITE = new Color(1, 1, 1)

/** Toàn bộ người trong chùa, mỗi bộ phận cơ thể là một InstancedMesh. */
export function Crowd() {
  const geo = useMemo(
    () => ({
      robe: new LatheGeometry([new Vector2(0.31, 0), new Vector2(0.3, 0.12), new Vector2(0.26, 0.45), new Vector2(0.21, 0.8), new Vector2(0.18, 1.0)], 14),
      torso: new LatheGeometry(
        [new Vector2(0.17, 0), new Vector2(0.185, 0.2), new Vector2(0.205, 0.42), new Vector2(0.2, 0.52), new Vector2(0.13, 0.6), new Vector2(0.06, 0.64), new Vector2(0.001, 0.65)],
        14,
      ),
      head: new SphereGeometry(0.12, 14, 10),
      hair: new SphereGeometry(0.128, 14, 8, 0, Math.PI * 2, 0, Math.PI * 0.58),
      limb: new CylinderGeometry(1, 0.85, 1, 7, 1).translate(0, 0.5, 0),
      hand: new SphereGeometry(0.045, 8, 6),
      blob: new PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    }),
    [],
  )
  const mats = useMemo(
    () => ({
      cloth: new MeshStandardMaterial({ roughness: 0.85 }),
      skin: new MeshStandardMaterial({ roughness: 0.62 }),
      hair: new MeshStandardMaterial({ roughness: 0.75 }),
      blob: new MeshBasicMaterial({ map: blobTexture(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, color: '#000000', opacity: 0.85 }),
    }),
    [],
  )
  const robe = useRef<InstancedMesh>(null!)
  const torso = useRef<InstancedMesh>(null!)
  const head = useRef<InstancedMesh>(null!)
  const hair = useRef<InstancedMesh>(null!)
  const limb = useRef<InstancedMesh>(null!)
  const hand = useRef<InstancedMesh>(null!)
  const blob = useRef<InstancedMesh>(null!)
  const rig = useMemo(newRigOut, [])
  const colorVersion = useRef(-1)

  useLayoutEffect(() => {
    // Tạo sẵn instanceColor trước lần vẽ đầu để shader biên dịch đúng một lần
    for (const m of [robe.current, torso.current, head.current, hair.current]) for (let i = 0; i < MAX_AVATARS; i++) m.setColorAt(i, WHITE)
    for (let i = 0; i < MAX_AVATARS * 4; i++) limb.current.setColorAt(i, WHITE)
    for (let i = 0; i < MAX_AVATARS * 2; i++) hand.current.setColorAt(i, WHITE)
  }, [])

  useFrame(() => {
    const list = runtime.avatars
    const n = list.length
    for (let i = 0; i < n; i++) {
      computeRig(list[i], runtime.time, rig)
      robe.current.setMatrixAt(i, rig.robe)
      torso.current.setMatrixAt(i, rig.torso)
      head.current.setMatrixAt(i, rig.head)
      hair.current.setMatrixAt(i, rig.hair)
      blob.current.setMatrixAt(i, rig.blob)
      for (let k = 0; k < 4; k++) limb.current.setMatrixAt(i * 4 + k, rig.limbs[k])
      for (let k = 0; k < 2; k++) hand.current.setMatrixAt(i * 2 + k, rig.hands[k])
    }
    for (const m of [robe.current, torso.current, head.current, hair.current, blob.current]) {
      m.count = n
      m.instanceMatrix.needsUpdate = true
    }
    limb.current.count = n * 4
    limb.current.instanceMatrix.needsUpdate = true
    hand.current.count = n * 2
    hand.current.instanceMatrix.needsUpdate = true

    if (colorVersion.current !== lookVersion.value) {
      colorVersion.current = lookVersion.value
      for (let i = 0; i < n; i++) {
        const a = list[i]
        robe.current.setColorAt(i, a.robe)
        torso.current.setColorAt(i, a.robe)
        head.current.setColorAt(i, a.skin)
        hair.current.setColorAt(i, a.hair)
        for (let k = 0; k < 4; k++) limb.current.setColorAt(i * 4 + k, a.robe)
        for (let k = 0; k < 2; k++) hand.current.setColorAt(i * 2 + k, a.skin)
      }
      for (const m of [robe.current, torso.current, head.current, hair.current, limb.current, hand.current]) if (m.instanceColor) m.instanceColor.needsUpdate = true
    }
    const cast = runtime.quality.avatarShadows
    robe.current.castShadow = cast
    torso.current.castShadow = cast
    head.current.castShadow = cast
  })

  return (
    <group>
      <instancedMesh ref={robe} args={[geo.robe, mats.cloth, MAX_AVATARS]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={torso} args={[geo.torso, mats.cloth, MAX_AVATARS]} frustumCulled={false} receiveShadow />
      <instancedMesh ref={head} args={[geo.head, mats.skin, MAX_AVATARS]} frustumCulled={false} />
      <instancedMesh ref={hair} args={[geo.hair, mats.hair, MAX_AVATARS]} frustumCulled={false} />
      <instancedMesh ref={limb} args={[geo.limb, mats.cloth, MAX_AVATARS * 4]} frustumCulled={false} />
      <instancedMesh ref={hand} args={[geo.hand, mats.skin, MAX_AVATARS * 2]} frustumCulled={false} />
      <instancedMesh ref={blob} args={[geo.blob, mats.blob, MAX_AVATARS]} frustumCulled={false} renderOrder={1} />
    </group>
  )
}
