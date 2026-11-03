import { describe, expect, it } from 'vitest'
import { isBlocked, resolveCircle } from './collision'
import { EDGES, NODES, SPOTS, buildColliders, findPath, heightAt, interactables, zoneAt } from './layout'

const colliders = buildColliders()
const R = 0.28

describe('bố cục', () => {
  it('mọi nút đường đi đều đứng được', () => {
    for (const [id, [x, z]] of Object.entries(NODES)) {
      expect(isBlocked({ x, z }, R, colliders), id).toBe(false)
    }
  })

  it('mọi cạnh của đồ thị đi thẳng được, không xuyên vật cản', () => {
    for (const [a, b] of EDGES) {
      const [ax, az] = NODES[a]
      const [bx, bz] = NODES[b]
      const steps = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2)
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const p = { x: ax + (bx - ax) * t, z: az + (bz - az) * t }
        expect(isBlocked(p, R, colliders), `${a} → ${b} tại t=${t.toFixed(2)}`).toBe(false)
      }
    }
  })

  it('từ cổng vào đi tới được mọi nút', () => {
    for (const id of Object.keys(NODES)) {
      if (id === 'spawn') continue
      const path = findPath('spawn', id)
      expect(path.at(-1), id).toBe(id)
    }
  })

  it('các chỗ đứng/ngồi cố định không nằm trong vật cản', () => {
    const spots = [SPOTS.bell, SPOTS.woodfish, SPOTS.worshipPlayer, SPOTS.lanternPlayer, SPOTS.lanternBots, ...SPOTS.worshipBots, ...SPOTS.meditation]
    for (const s of spots) expect(isBlocked(s, R, colliders), JSON.stringify(s)).toBe(false)
  })

  it('mỗi chỗ đứng nằm trong tầm của điểm tương tác tương ứng', () => {
    const byId = Object.fromEntries(interactables.map((i) => [i.id, i]))
    const near = (id: string, s: { x: number; z: number }) => Math.hypot(byId[id].x - s.x, byId[id].z - s.z) <= byId[id].radius
    expect(near('bell', SPOTS.bell)).toBe(true)
    expect(near('woodfish', SPOTS.woodfish)).toBe(true)
    expect(near('worship', SPOTS.worshipPlayer)).toBe(true)
    expect(near('lantern', SPOTS.lanternPlayer)).toBe(true)
  })
})

describe('nền và vùng', () => {
  it('bậc thềm dẫn lên nền Chính điện', () => {
    expect(heightAt(0, -4.6)).toBe(0)
    expect(heightAt(0, -4.8)).toBeCloseTo(0.225)
    expect(heightAt(0, -6.4)).toBeCloseTo(0.9)
    expect(heightAt(0, -12)).toBeCloseTo(0.9)
    const mid = heightAt(0, -5.6)
    expect(mid).toBeGreaterThan(0)
    expect(mid).toBeLessThan(0.9)
  })

  it('nhận đúng vùng', () => {
    expect(zoneAt(0, -14)).toBe('chinhDien')
    expect(zoneAt(0, 12)).toBe('sanChua')
    expect(zoneAt(0, 30)).toBe('tamQuan')
    expect(zoneAt(-12, 40)).toBe('hoSen')
    expect(zoneAt(10.5, 16)).toBe('gacChuong')
  })
})

describe('va chạm', () => {
  it('không đi xuyên tường bao', () => {
    const p = { x: 12, z: 30 }
    resolveCircle(p, R, colliders)
    expect(Math.abs(p.z - 30)).toBeGreaterThan(0.6)
  })

  it('đi qua được lối giữa Tam quan', () => {
    expect(isBlocked({ x: 0, z: 30 }, R, colliders)).toBe(false)
  })

  it('không bước lên nền Chính điện từ bên hông', () => {
    const p = { x: 6, z: -6.3 }
    resolveCircle(p, R, colliders)
    expect(p.z).toBeGreaterThan(-6.5)
  })
})
