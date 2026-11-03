import { useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import { buildTemple } from '../world/architecture'
import { NO_CAST, getMaterials } from '../world/materials'
import { plaqueTexture } from '../world/textures'

/** Toàn bộ kiến trúc tĩnh, đã gộp theo vật liệu (mỗi vật liệu một draw call). */
export function StaticWorld() {
  const parts = useMemo(() => buildTemple(), [])
  const mats = getMaterials()
  return (
    <group>
      {parts.map((p) => (
        <mesh key={p.key} geometry={p.geometry} material={mats[p.key]} castShadow={!NO_CAST.has(p.key)} receiveShadow />
      ))}
      <Plaques />
    </group>
  )
}

/** Bảng hoành phi chữ vàng: Chính điện và hai mặt cổng Tam quan. */
function Plaques() {
  const boards = useMemo(
    () => [
      { mat: new MeshStandardMaterial({ map: plaqueTexture('ĐẠI HÙNG BẢO ĐIỆN'), roughness: 0.55 }), pos: [0, 4.36, -8.82] as const, size: [3.1, 0.78] as const, rotY: 0 },
      { mat: new MeshStandardMaterial({ map: plaqueTexture('TỪ BI', 512, 192), roughness: 0.55 }), pos: [0, 3.9, 30.97] as const, size: [1.5, 0.56] as const, rotY: 0 },
      { mat: new MeshStandardMaterial({ map: plaqueTexture('HỶ XẢ', 512, 192), roughness: 0.55 }), pos: [0, 3.9, 29.03] as const, size: [1.5, 0.56] as const, rotY: Math.PI },
    ],
    [],
  )
  return (
    <>
      {boards.map((b, i) => (
        <mesh key={i} position={b.pos} rotation-y={b.rotY} material={b.mat}>
          <planeGeometry args={b.size} />
        </mesh>
      ))}
    </>
  )
}
