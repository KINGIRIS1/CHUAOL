import {
  BoxGeometry,
  BufferAttribute,
  type BufferGeometry,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { L, heightAt } from '../layout'
import type { MatKey } from './materials'

const KEEP = new Set(['position', 'normal', 'uv'])
const tmpV = new Vector3()
const tmpQ = new Quaternion()
const tmpE = new Euler()
const ONE = new Vector3(1, 1, 1)

const hash = (x: number, z: number) => {
  const s = Math.sin(x * 12.9898 + z * 78.233) * 43758.5453
  return s - Math.floor(s)
}

/** Che tối giả (fake AO): chân tường tối hơn, trong lòng Chính điện tối hơn. */
function vertexShade(mat: MatKey, x: number, y: number, z: number): number {
  if (mat === 'roof' || mat === 'ridge') return 0.82 + 0.22 * hash(Math.floor(x * 0.7), Math.floor(z * 0.7))
  if (mat === 'leaf' || mat === 'leafDark' || mat === 'bamboo') return 0.78 + 0.32 * hash(Math.floor(x * 2), Math.floor(y * 2 + z))
  const h = L.hall
  const inHall = x > h.minX - 0.3 && x < h.maxX + 0.3 && z > h.minZ - 0.4 && z < h.maxZ + 0.3 && y < h.wallTop + 0.3
  if (mat === 'gold' || mat === 'candle') return 1
  if (mat === 'grass' || mat === 'brick' || mat === 'path' || mat === 'hill' || mat === 'sand') return inHall ? 0.6 : 1
  const ground = heightAt(x, z)
  let s = 0.58 + 0.42 * Math.min(1, Math.max(0, (y - ground) / 1.5))
  if (inHall) s *= 0.62
  return s
}

export interface BuiltPart {
  key: MatKey
  geometry: BufferGeometry
}

export class WorldBuilder {
  private parts = new Map<MatKey, BufferGeometry[]>()

  add(mat: MatKey, geo: BufferGeometry, m?: Matrix4): void {
    const g = geo
    if (m) g.applyMatrix4(m)
    const n = g.attributes.position.count
    if (!g.index) {
      const idx = new (n > 65535 ? Uint32Array : Uint16Array)(n)
      for (let i = 0; i < n; i++) idx[i] = i
      g.setIndex(new BufferAttribute(idx, 1))
    }
    if (!g.attributes.normal) g.computeVertexNormals()
    if (!g.attributes.uv) g.setAttribute('uv', new BufferAttribute(new Float32Array(n * 2), 2))
    for (const k of Object.keys(g.attributes)) if (!KEEP.has(k)) g.deleteAttribute(k)
    const pos = g.attributes.position
    const col = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const s = vertexShade(mat, pos.getX(i), pos.getY(i), pos.getZ(i))
      col[i * 3] = s
      col[i * 3 + 1] = s
      col[i * 3 + 2] = s
    }
    g.setAttribute('color', new BufferAttribute(col, 3))
    g.clearGroups()
    let list = this.parts.get(mat)
    if (!list) this.parts.set(mat, (list = []))
    list.push(g)
  }

  /** Hộp đặt theo tâm. */
  box(mat: MatKey, cx: number, cy: number, cz: number, sx: number, sy: number, sz: number, rotY = 0, rotX = 0, rotZ = 0) {
    const m = new Matrix4().compose(tmpV.set(cx, cy, cz), tmpQ.setFromEuler(tmpE.set(rotX, rotY, rotZ, 'YXZ')), ONE)
    this.add(mat, new BoxGeometry(sx, sy, sz), m)
  }

  /** Hộp theo khoảng tọa độ min/max. */
  boxMinMax(mat: MatKey, minX: number, maxX: number, minY: number, maxY: number, minZ: number, maxZ: number) {
    this.box(mat, (minX + maxX) / 2, (minY + maxY) / 2, (minZ + maxZ) / 2, maxX - minX, maxY - minY, maxZ - minZ)
  }

  /** Trụ tròn, y là chân trụ. */
  cyl(mat: MatKey, x: number, y: number, z: number, rTop: number, rBottom: number, h: number, seg = 12) {
    const g = new CylinderGeometry(rTop, rBottom, h, seg, 1)
    this.add(mat, g, new Matrix4().makeTranslation(x, y + h / 2, z))
  }

  /** Đoạn trụ nối hai điểm. */
  segment(mat: MatKey, a: Vector3, b: Vector3, r: number, seg = 8) {
    const d = new Vector3().subVectors(b, a)
    const len = d.length()
    const g = new CylinderGeometry(r, r, len, seg, 1)
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), d.normalize())
    const mid = new Vector3().addVectors(a, b).multiplyScalar(0.5)
    this.add(mat, g, new Matrix4().compose(mid, q, ONE))
  }

  sphere(mat: MatKey, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rotY = 0, rotX = 0, seg = 12) {
    const m = new Matrix4().compose(tmpV.set(x, y, z), tmpQ.setFromEuler(tmpE.set(rotX, rotY, 0, 'YXZ')), new Vector3(sx, sy, sz))
    this.add(mat, new SphereGeometry(1, seg, Math.max(6, Math.round(seg * 0.7))), m)
  }

  blob(mat: MatKey, x: number, y: number, z: number, r: number, squash = 0.8, detail = 1) {
    const m = new Matrix4().compose(tmpV.set(x, y, z), tmpQ.identity(), new Vector3(r, r * squash, r))
    this.add(mat, new IcosahedronGeometry(1, detail), m)
  }

  /** Mặt phẳng ngang với UV theo tọa độ thế giới (texture lặp đều). */
  planeXZ(mat: MatKey, minX: number, maxX: number, minZ: number, maxZ: number, y: number, tile: number) {
    const w = maxX - minX
    const d = maxZ - minZ
    const seg = (v: number) => Math.min(12, Math.max(1, Math.round(v / 6)))
    const g = new PlaneGeometry(w, d, seg(w), seg(d))
    g.rotateX(-Math.PI / 2)
    g.translate(minX + w / 2, y, minZ + d / 2)
    const pos = g.attributes.position
    const uv = g.attributes.uv
    for (let i = 0; i < pos.count; i++) uv.setXY(i, pos.getX(i) / tile, pos.getZ(i) / tile)
    this.add(mat, g)
  }

  build(): BuiltPart[] {
    const out: BuiltPart[] = []
    for (const [key, list] of this.parts) {
      const merged = mergeGeometries(list, false)
      if (!merged) continue
      merged.computeBoundingSphere()
      out.push({ key, geometry: merged })
      for (const g of list) g.dispose()
    }
    return out
  }
}
