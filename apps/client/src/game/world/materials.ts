import { Color, DoubleSide, type Material, MeshStandardMaterial } from 'three'
import { brickTexture, grassTexture, roofTileTexture, stoneTexture } from './textures'

export type MatKey =
  | 'plaster'
  | 'plinth'
  | 'lacquer'
  | 'wood'
  | 'woodDark'
  | 'roof'
  | 'ridge'
  | 'stone'
  | 'stoneDark'
  | 'brick'
  | 'grass'
  | 'path'
  | 'bronze'
  | 'gold'
  | 'leaf'
  | 'leafDark'
  | 'leafFlat'
  | 'trunk'
  | 'bamboo'
  | 'cushion'
  | 'redCloth'
  | 'sand'
  | 'flowerPink'
  | 'flowerYellow'
  | 'pot'
  | 'candle'
  | 'woodMo'
  | 'lantern'
  | 'hill'
  | 'white'

/** Các vật liệu không đổ bóng hoặc không nhận bóng. */
export const NO_CAST: ReadonlySet<MatKey> = new Set(['grass', 'brick', 'path', 'hill', 'sand'])

let cache: Record<MatKey, Material> | null = null

export function getMaterials(): Record<MatKey, Material> {
  if (cache) return cache
  const std = (color: string, opts: Partial<ConstructorParameters<typeof MeshStandardMaterial>[0]> = {}) =>
    new MeshStandardMaterial({ color: new Color(color), roughness: 0.9, metalness: 0, vertexColors: true, ...opts })

  const roofMap = roofTileTexture()
  const brickMap = brickTexture()
  const grassMap = grassTexture()
  const pathMap = stoneTexture()

  cache = {
    plaster: std('#cfb27c', { roughness: 0.95 }),
    plinth: std('#8a8273'),
    lacquer: std('#8c2f22', { roughness: 0.5 }),
    wood: std('#6e4a31', { roughness: 0.8 }),
    woodDark: std('#3d2a1d', { roughness: 0.85 }),
    roof: std('#ffffff', { map: roofMap, roughness: 0.85, side: DoubleSide }),
    ridge: std('#7c3f2a', { roughness: 0.8 }),
    stone: std('#9c978b', { roughness: 0.92 }),
    stoneDark: std('#6f6b62', { roughness: 0.92 }),
    brick: std('#ffffff', { map: brickMap, roughness: 0.9 }),
    grass: std('#ffffff', { map: grassMap, roughness: 1 }),
    path: std('#ffffff', { map: pathMap, roughness: 0.9 }),
    bronze: std('#7a6440', { metalness: 0.7, roughness: 0.42, side: DoubleSide }),
    gold: std('#d1a64c', { metalness: 0.82, roughness: 0.3, emissive: new Color('#3a2408'), emissiveIntensity: 0.6 }),
    leaf: std('#5d7e38', { flatShading: true }),
    leafDark: std('#456a30', { flatShading: true }),
    leafFlat: std('#5a7d36', { side: DoubleSide }),
    trunk: std('#5b4636'),
    bamboo: std('#86a04d', { roughness: 0.7 }),
    cushion: std('#c08f2e', { roughness: 0.95 }),
    redCloth: std('#9b2a20', { roughness: 0.95 }),
    sand: std('#b8a888', { roughness: 1 }),
    flowerPink: std('#e59aa5', { roughness: 0.8 }),
    flowerYellow: std('#ebbf3f', { roughness: 0.8 }),
    pot: std('#6e4b3a', { roughness: 0.7 }),
    candle: std('#f3e8cf', { emissive: new Color('#ffcf8a'), emissiveIntensity: 0.35 }),
    woodMo: std('#8a3a20', { roughness: 0.45 }),
    lantern: std('#a8291c', { emissive: new Color('#ff5a24'), emissiveIntensity: 0.12, roughness: 0.7 }),
    hill: std('#4c6248', { flatShading: true, roughness: 1 }),
    white: std('#ece6d8'),
  }
  return cache
}

const plainCache = new Map<MatKey, Material>()

/** Bản sao không dùng màu đỉnh, cho các vật thể động (chuông, chày...) không có thuộc tính màu. */
export function plainMaterial(key: MatKey): Material {
  let m = plainCache.get(key)
  if (!m) {
    m = getMaterials()[key].clone()
    m.vertexColors = false
    plainCache.set(key, m)
  }
  return m
}
