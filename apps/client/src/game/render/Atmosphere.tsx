import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  type DirectionalLight,
  Fog,
  type HemisphereLight,
  type Mesh,
  MeshBasicMaterial,
  Object3D,
  PMREMGenerator,
  type PointLight,
  PointsMaterial,
  Scene,
  Vector3,
  type WebGLRenderTarget,
} from 'three'
import { Sky } from 'three/examples/jsm/objects/Sky.js'
import { lerp, smoothstep } from '../../lib/rng'
import { player, runtime } from '../runtime'

const c = (hex: string) => new Color(hex)
const SUN_WARM = c('#ffa45c')
const SUN_WHITE = c('#fff2de')
const MOON = c('#9fb4dc')
const HEMI_SKY_DAY = c('#bcd2e6')
const HEMI_SKY_NIGHT = c('#42548a')
const HEMI_GROUND_DAY = c('#6f5d48')
const HEMI_GROUND_NIGHT = c('#2b241c')
const FOG_DAY = c('#c3d0d4')
const FOG_DUSK = c('#e6bb92')
const FOG_NIGHT = c('#1a2134')
const MOON_DIR = new Vector3(-0.35, 0.78, 0.45).normalize()

/** Hướng mặt trời theo giờ: mọc ở phía đông (+x), lên cao về phía nam (+z), lặn ở phía tây. */
export function sunDirection(hour: number, out = new Vector3()): Vector3 {
  const a = ((hour - 6) / 12) * Math.PI
  return out.set(Math.cos(a), Math.sin(a), 0.35).normalize()
}

function makeStars() {
  const n = 1400
  const pos = new Float32Array(n * 3)
  for (let i = 0; i < n; i++) {
    const u = Math.random()
    const th = Math.random() * Math.PI * 2
    const y = 0.08 + u * 0.92
    const r = Math.sqrt(1 - y * y)
    pos.set([Math.cos(th) * r * 380, y * 380, Math.sin(th) * r * 380], i * 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  return g
}

/** Bầu trời, mặt trời/mặt trăng, ánh sáng, sương mù, sao — đổi theo giờ Việt Nam. */
export function Atmosphere() {
  const { scene, gl, camera } = useThree()
  const sky = useMemo(() => {
    const s = new Sky()
    s.scale.setScalar(450)
    return s
  }, [])
  const env = useMemo(() => {
    const sc = new Scene()
    const s = new Sky()
    s.scale.setScalar(50)
    sc.add(s)
    return { scene: sc, sky: s, pmrem: new PMREMGenerator(gl), rt: null as WebGLRenderTarget | null, hour: -100 }
  }, [gl])
  const fog = useMemo(() => new Fog('#cfdadd', 35, 210), [])
  const stars = useMemo(makeStars, [])
  const starMat = useMemo(() => new PointsMaterial({ size: 1.6, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false, color: '#ffffff' }), [])
  const moonMat = useMemo(() => new MeshBasicMaterial({ color: '#f3eedc', fog: false, transparent: true }), [])
  const sun = useRef<DirectionalLight>(null!)
  const hemi = useRef<HemisphereLight>(null!)
  const hallLight = useRef<PointLight>(null!)
  const moon = useRef<Mesh>(null!)
  const target = useMemo(() => new Object3D(), [])
  const dir = useMemo(() => new Vector3(), [])
  const lightDir = useMemo(() => new Vector3(), [])
  const shadowSize = useRef(0)

  useEffect(() => {
    scene.fog = fog
    scene.add(target)
    return () => {
      scene.fog = null
      scene.remove(target)
      env.rt?.dispose()
      env.pmrem.dispose()
    }
  }, [scene, fog, target, env])

  useFrame(() => {
    const e = runtime.env
    sunDirection(e.hour, dir)
    e.sunDir.copy(dir)
    const elev = dir.y
    const day = smoothstep(-0.1, 0.14, elev)
    const warm = smoothstep(0.45, 0.04, elev) * smoothstep(-0.12, 0.02, elev)
    e.night = 1 - day

    for (const s of [sky, env.sky]) {
      const u = s.material.uniforms
      u.sunPosition.value.copy(dir)
      u.turbidity.value = 6.5
      u.rayleigh.value = lerp(1.1, 2.6, warm)
      u.mieCoefficient.value = 0.006
      u.mieDirectionalG.value = 0.86
    }

    // Ánh sáng chính: mặt trời ban ngày, trăng ban đêm
    const L = sun.current
    const useSun = elev > -0.03
    if (useSun) lightDir.copy(dir).setY(Math.max(0.12, dir.y)).normalize()
    else lightDir.copy(MOON_DIR)
    if (useSun) {
      L.color.copy(SUN_WHITE).lerp(SUN_WARM, warm)
      L.intensity = day * lerp(0.9, 2.3, smoothstep(0.04, 0.5, elev))
    } else {
      L.color.copy(MOON)
      L.intensity = 0.9 * e.night
    }
    // Vùng đổ bóng đi theo người chơi, bám theo lưới texel để bóng không rung
    const p = player()
    const cx = p ? p.x : 0
    const cz = p ? p.z : 8
    const range = 26
    const texel = (range * 2) / Math.max(256, L.shadow.mapSize.x)
    const tx = Math.round(cx / texel) * texel
    const tz = Math.round(cz / texel) * texel
    target.position.set(tx, 0, tz)
    L.position.set(tx + lightDir.x * 70, lightDir.y * 70, tz + lightDir.z * 70)
    L.target = target

    const q = runtime.quality
    L.castShadow = q.shadows
    if (q.shadows && shadowSize.current !== q.shadowMapSize) {
      shadowSize.current = q.shadowMapSize
      L.shadow.mapSize.set(q.shadowMapSize, q.shadowMapSize)
      L.shadow.map?.dispose()
      L.shadow.map = null
    }

    hemi.current.color.copy(HEMI_SKY_NIGHT).lerp(HEMI_SKY_DAY, day)
    hemi.current.groundColor.copy(HEMI_GROUND_NIGHT).lerp(HEMI_GROUND_DAY, day)
    hemi.current.intensity = lerp(1.0, 0.78, day)

    fog.color.copy(FOG_NIGHT).lerp(FOG_DAY, day).lerp(FOG_DUSK, warm * 0.55)
    fog.far = q.fogFar
    fog.near = q.fogFar * 0.3
    gl.toneMappingExposure = lerp(1.4, 0.88, day)
    scene.environmentIntensity = lerp(0.15, 0.45, day)

    starMat.opacity = Math.max(0, 1 - day * 1.6)
    moon.current.position.copy(camera.position).addScaledVector(MOON_DIR, 340)
    moon.current.lookAt(camera.position)
    moonMat.opacity = Math.max(0, 1 - day * 1.3)
    sky.position.copy(camera.position)

    hallLight.current.visible = q.pointLight
    hallLight.current.intensity = lerp(9, 5, day)

    // Ảnh môi trường (phản chiếu trên đồng, vàng) lấy từ bầu trời, cập nhật khi giờ đổi đáng kể
    if (Math.abs(e.hour - env.hour) > 0.2) {
      env.hour = e.hour
      const rt = env.pmrem.fromScene(env.scene, 0.04)
      env.rt?.dispose()
      env.rt = rt
      scene.environment = rt.texture
    }
  })

  return (
    <>
      <primitive object={sky} />
      <directionalLight
        ref={sun}
        intensity={2.5}
        shadow-bias={-0.0004}
        shadow-normalBias={0.04}
        shadow-camera-left={-26}
        shadow-camera-right={26}
        shadow-camera-top={26}
        shadow-camera-bottom={-26}
        shadow-camera-near={5}
        shadow-camera-far={160}
      />
      <hemisphereLight ref={hemi} />
      <pointLight ref={hallLight} position={[0, 3.4, -15.6]} color="#ffbe7a" distance={13} decay={1.6} />
      <points geometry={stars} material={starMat} frustumCulled={false} />
      <mesh ref={moon} material={moonMat}>
        <circleGeometry args={[7, 32]} />
      </mesh>
    </>
  )
}

