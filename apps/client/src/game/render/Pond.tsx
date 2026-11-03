import { useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import {
  CircleGeometry,
  Color,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  Euler,
  type InstancedMesh,
  LatheGeometry,
  Matrix4,
  MeshStandardMaterial,
  type PerspectiveCamera,
  Quaternion,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { mulberry32 } from '../../lib/rng'
import { L } from '../layout'
import { runtime } from '../runtime'
import { MAX_LANTERNS } from '../systems'
import { pointScale } from './Incense'
import { markDirty, pointsGeometry, pointsMaterial } from './points'

const P = L.pond
const m = new Matrix4()
const q = new Quaternion()
const e = new Euler()
const v = new Vector3()
const sc = new Vector3()
const SKY_DAY = new Color('#9fb7c4')
const SKY_NIGHT = new Color('#1e2a44')
const SUN_COLOR = new Color('#fff1d6')

const waterVertex = /* glsl */ `
  #include <fog_pars_vertex>
  varying vec3 vWorld;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vWorld = wp.xyz;
    vec4 mvPosition = viewMatrix * wp;
    gl_Position = projectionMatrix * mvPosition;
    #include <fog_vertex>
  }
`

const waterFragment = /* glsl */ `
  #include <fog_pars_fragment>
  uniform float uTime;
  uniform vec3 uSky;
  uniform vec3 uDeep;
  uniform vec3 uShallow;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec2 uCenter;
  uniform vec2 uRadii;
  varying vec3 vWorld;
  float wave(vec2 p) {
    return sin(p.x * 1.7 + uTime * 0.9) * 0.5 + sin(p.y * 2.3 - uTime * 1.1) * 0.5 + sin((p.x + p.y) * 3.7 + uTime * 1.6) * 0.25;
  }
  void main() {
    vec2 p = vWorld.xz;
    float e = 0.08;
    float h = wave(p);
    vec3 n = normalize(vec3(-(wave(p + vec2(e, 0.0)) - h) / e * 0.05, 1.0, -(wave(p + vec2(0.0, e)) - h) / e * 0.05));
    vec3 viewDir = normalize(cameraPosition - vWorld);
    float fres = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);
    float r = length((p - uCenter) / uRadii);
    vec3 col = mix(uDeep, uShallow, smoothstep(0.5, 1.0, r));
    col = mix(col, uSky, 0.12 + 0.6 * fres);
    vec3 hv = normalize(uSunDir + viewDir);
    col += uSunColor * pow(max(dot(n, hv), 0.0), 140.0) * 0.8;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

/** Hồ sen: mặt nước, lá và hoa sen, đèn hoa đăng trôi. */
export function Pond() {
  const { camera, gl } = useThree()
  const water = useMemo(
    () =>
      new ShaderMaterial({
        uniforms: UniformsUtils.merge([
          UniformsLib.fog,
          {
            uTime: { value: 0 },
            uSky: { value: new Color('#9fb7c4') },
            uDeep: { value: new Color('#21423d') },
            uShallow: { value: new Color('#4c6b55') },
            uSunDir: { value: new Vector3(0.5, 0.8, 0.3) },
            uSunColor: { value: new Color('#fff1d6') },
            uCenter: { value: new Vector2(P.x, P.z) },
            uRadii: { value: new Vector2(P.rx, P.rz) },
          },
        ]),
        vertexShader: waterVertex,
        fragmentShader: waterFragment,
        fog: true,
      }),
    [],
  )
  const waterGeo = useMemo(() => new CircleGeometry(1, 56).rotateX(-Math.PI / 2), [])

  const leafGeo = useMemo(() => new CircleGeometry(1, 16, 0.35, Math.PI * 2 - 0.55).rotateX(-Math.PI / 2), [])
  const leafMat = useMemo(() => new MeshStandardMaterial({ color: '#4f7a3a', roughness: 0.8, side: DoubleSide }), [])
  const flowerGeo = useMemo(() => {
    const petals = []
    for (let i = 0; i < 7; i++) {
      const c = new ConeGeometry(0.06, 0.2, 5).translate(0, 0.1, 0)
      c.applyMatrix4(new Matrix4().makeRotationZ(0.45))
      c.applyMatrix4(new Matrix4().makeRotationY((i / 7) * Math.PI * 2))
      petals.push(c)
    }
    petals.push(new CylinderGeometry(0.035, 0.04, 0.06, 8).translate(0, 0.05, 0))
    return mergeGeometries(petals.map((g) => g.toNonIndexed()))!
  }, [])
  const flowerMat = useMemo(() => new MeshStandardMaterial({ color: '#eaa3b5', roughness: 0.6, emissive: new Color('#6a2a3a'), emissiveIntensity: 0.25 }), [])
  const leaves = useRef<InstancedMesh>(null!)
  const flowers = useRef<InstancedMesh>(null!)
  const LEAVES = 48
  const FLOWERS = 15
  const layout = useMemo(() => {
    const r = mulberry32(99)
    const items: Array<{ x: number; z: number; s: number; rot: number; phase: number }> = []
    while (items.length < LEAVES) {
      const a = r() * Math.PI * 2
      const d = Math.sqrt(r()) * 0.86
      const x = P.x + Math.cos(a) * d * P.rx
      const z = P.z + Math.sin(a) * d * P.rz
      if (x > -7.2 && Math.abs(z - 40) < 2) continue // chừa lối thả đèn
      items.push({ x, z, s: 0.28 + r() * 0.32, rot: r() * Math.PI * 2, phase: r() * 10 })
    }
    return items
  }, [])

  const lanternGeo = useMemo(() => {
    const parts = []
    for (let i = 0; i < 8; i++) {
      const c = new ConeGeometry(0.065, 0.2, 4).translate(0, 0.1, 0)
      c.applyMatrix4(new Matrix4().makeRotationZ(0.5))
      c.applyMatrix4(new Matrix4().makeRotationY((i / 8) * Math.PI * 2))
      parts.push(c.toNonIndexed())
    }
    parts.push(new LatheGeometry([new Vector2(0.001, 0), new Vector2(0.17, 0), new Vector2(0.2, 0.04), new Vector2(0.001, 0.04)], 12).toNonIndexed())
    parts.push(new CylinderGeometry(0.035, 0.035, 0.1, 8).translate(0, 0.08, 0).toNonIndexed())
    return mergeGeometries(parts)!
  }, [])
  const lanternMat = useMemo(() => new MeshStandardMaterial({ color: '#f6dccf', roughness: 0.7, emissive: new Color('#ff8e5a'), emissiveIntensity: 0.5 }), [])
  const lanterns = useRef<InstancedMesh>(null!)
  const glow = useMemo(() => pointsGeometry(MAX_LANTERNS * 2), [])
  const glowMat = useMemo(() => pointsMaterial({ additive: true, color: '#ffb066' }), [])

  useLayoutEffect(() => {
    layout.forEach((it, i) => {
      m.compose(v.set(it.x, P.water + 0.02, it.z), q.setFromEuler(e.set(0, it.rot, 0)), sc.set(it.s, 1, it.s))
      leaves.current.setMatrixAt(i, m)
      if (i < FLOWERS) {
        m.compose(v.set(it.x + 0.05, P.water + 0.03, it.z + 0.04), q.identity(), sc.set(1, 1, 1))
        flowers.current.setMatrixAt(i, m)
      }
    })
    leaves.current.instanceMatrix.needsUpdate = true
    flowers.current.instanceMatrix.needsUpdate = true
  }, [layout])

  useFrame(() => {
    const t = runtime.time
    const u = water.uniforms
    u.uTime.value = t
    u.uSunDir.value.copy(runtime.env.sunDir)
    const night = runtime.env.night
    u.uSky.value.copy(SKY_DAY).lerp(SKY_NIGHT, night)
    u.uSunColor.value.copy(SUN_COLOR).multiplyScalar(1 - night * 0.85)

    const list = runtime.lanterns
    let n = 0
    for (const l of list) {
      const age = t - l.born
      const fade = Math.min(1, age / 1.5, (l.life - age) / 8)
      const bob = Math.sin(t * 1.6 + l.seed) * 0.012
      m.compose(v.set(l.x, P.water + 0.04 + bob, l.z), q.setFromEuler(e.set(Math.sin(t + l.seed) * 0.05, l.seed + t * 0.05, 0)), sc.setScalar(Math.max(0.001, fade)))
      lanterns.current.setMatrixAt(n, m)
      glow.position.set([l.x, P.water + 0.2 + bob, l.z], n * 6)
      glow.position.set([l.x, P.water + 0.01, l.z], n * 6 + 3)
      const flick = 0.85 + 0.15 * Math.sin(t * 11 + l.seed * 3)
      glow.size[n * 2] = 0.42
      glow.alpha[n * 2] = fade * flick * (0.45 + night * 0.55)
      glow.size[n * 2 + 1] = 0.9
      glow.alpha[n * 2 + 1] = fade * flick * (0.12 + night * 0.3)
      n++
    }
    for (let k = n * 2; k < MAX_LANTERNS * 2; k++) glow.alpha[k] = 0
    lanterns.current.count = n
    lanterns.current.instanceMatrix.needsUpdate = true
    lanternMat.emissiveIntensity = 0.5 + night * 1.6
    markDirty(glow.geometry, 'position', 'aSize', 'aAlpha')
    glowMat.uniforms.uScale.value = pointScale(camera as PerspectiveCamera, gl.domElement.height)
  })

  return (
    <group>
      <mesh geometry={waterGeo} material={water} position={[P.x, P.water, P.z]} scale={[P.rx + 0.15, 1, P.rz + 0.15]} receiveShadow />
      <instancedMesh ref={leaves} args={[leafGeo, leafMat, LEAVES]} receiveShadow />
      <instancedMesh ref={flowers} args={[flowerGeo, flowerMat, FLOWERS]} />
      <instancedMesh ref={lanterns} args={[lanternGeo, lanternMat, MAX_LANTERNS]} frustumCulled={false} />
      <points geometry={glow.geometry} material={glowMat} frustumCulled={false} renderOrder={5} />
    </group>
  )
}
