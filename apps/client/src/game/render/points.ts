import { AdditiveBlending, BufferAttribute, BufferGeometry, Color, NormalBlending, ShaderMaterial } from 'three'

/**
 * Vật liệu điểm mềm (khói, đốm sáng) có kích thước theo không gian thế giới.
 * uScale = chiều cao canvas (px) / (2·tan(fov/2)), cập nhật mỗi khung hình.
 */
export function pointsMaterial(opts: { additive?: boolean; color?: string; colorAttr?: boolean } = {}): ShaderMaterial {
  const useColor = !!opts.colorAttr
  return new ShaderMaterial({
    uniforms: {
      uScale: { value: 800 },
      uColor: { value: new Color(opts.color ?? '#ffffff') },
      uIntensity: { value: 1 },
      uNight: { value: 0 },
    },
    vertexShader: /* glsl */ `
      attribute float aSize;
      attribute float aAlpha;
      attribute float aNight;
      ${useColor ? 'attribute vec3 aColor; varying vec3 vColor;' : ''}
      uniform float uScale;
      uniform float uNight;
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = aSize * uScale / max(0.2, -mv.z);
        vAlpha = aAlpha * mix(1.0, uNight, aNight);
        ${useColor ? 'vColor = aColor;' : ''}
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      varying float vAlpha;
      ${useColor ? 'varying vec3 vColor;' : ''}
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d);
        a *= a;
        if (a * vAlpha < 0.002) discard;
        vec3 col = ${useColor ? 'vColor' : 'uColor'} * uIntensity;
        gl_FragColor = vec4(col, a * vAlpha);
        #include <colorspace_fragment>
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: opts.additive ? AdditiveBlending : NormalBlending,
  })
}

export interface PointsBuffers {
  geometry: BufferGeometry
  position: Float32Array
  size: Float32Array
  alpha: Float32Array
  night: Float32Array
  color?: Float32Array
}

export function pointsGeometry(count: number, withColor = false): PointsBuffers {
  const geometry = new BufferGeometry()
  const position = new Float32Array(count * 3)
  const size = new Float32Array(count)
  const alpha = new Float32Array(count)
  const night = new Float32Array(count)
  geometry.setAttribute('position', new BufferAttribute(position, 3))
  geometry.setAttribute('aSize', new BufferAttribute(size, 1))
  geometry.setAttribute('aAlpha', new BufferAttribute(alpha, 1))
  geometry.setAttribute('aNight', new BufferAttribute(night, 1))
  let color: Float32Array | undefined
  if (withColor) {
    color = new Float32Array(count * 3)
    geometry.setAttribute('aColor', new BufferAttribute(color, 3))
  }
  return { geometry, position, size, alpha, night, color }
}

export function markDirty(g: BufferGeometry, ...names: string[]) {
  for (const n of names) g.attributes[n].needsUpdate = true
}
