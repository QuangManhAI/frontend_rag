import * as THREE from 'three';
import type { Vec3 } from '../../../types/world';
import { ParticlePool } from '../../../utils/crawlFlow';
import { toUpdateRanges } from '../../../utils/canopyUpdate';
import { SOFT_POINT_FRAG } from '../materials';

const VERT = /* glsl */ `
  attribute float aPath;
  attribute float aStart;
  attribute float aDur;
  attribute vec2 aJit;
  attribute vec3 aColor;
  uniform sampler2D uPaths;
  uniform float uRows;
  uniform float uSamples;
  uniform float uNow;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uSpread;
  uniform float uConverge;
  uniform vec3 uTail;
  uniform float uTailMix;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = (uNow - aStart) / aDur;
    if (t < 0.0 || t > 1.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vAlpha = 0.0;
      vColor = vec3(0.0);
      return;
    }
    float f = t * (uSamples - 1.0);
    float i0 = floor(f);
    float v = (aPath + 0.5) / uRows;
    vec3 a = texture2D(uPaths, vec2((i0 + 0.5) / uSamples, v)).xyz;
    vec3 b = texture2D(uPaths, vec2((min(i0 + 1.0, uSamples - 1.0) + 0.5) / uSamples, v)).xyz;
    vec3 p = mix(a, b, f - i0);
    // uConverge 1: wide at the source, converging onto the path end; 0: a column of constant width.
    float spread = mix(1.0, (1.0 - t) * (1.0 - t), uConverge) * uSpread;
    p.xz += aJit * spread;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp(uSize * uScale / -mv.z, 1.5, 10.0) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
    vColor = mix(aColor, uTail, smoothstep(0.35, 0.9, t) * uTailMix) * (1.0 + 0.7 * smoothstep(0.85, 1.0, t));
    vAlpha = smoothstep(0.0, 0.05, t) * (1.0 - smoothstep(0.93, 1.0, t));
  }
`;

/**
 * A fixed pool of path-following particles in ONE THREE.Points. Paths live in a float DataTexture
 * (one row per path, `samples` points each); the CPU only writes a particle's slot when it is
 * emitted. No allocation happens per frame.
 */
export class StreamParticles {
  readonly points: THREE.Points;
  readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.BufferGeometry();
  private readonly pathData: Float32Array;
  private readonly pathTex: THREE.DataTexture;
  private readonly pool: ParticlePool;
  private readonly aPath: THREE.BufferAttribute;
  private readonly aStart: THREE.BufferAttribute;
  private readonly aDur: THREE.BufferAttribute;
  private readonly aJit: THREE.BufferAttribute;
  private readonly aColor: THREE.BufferAttribute;
  private touched: number[] = [];
  private pathsDirty = false;

  constructor(
    readonly size: number,
    readonly rows: number,
    readonly samples: number,
  ) {
    this.pool = new ParticlePool(size);
    this.pathData = new Float32Array(rows * samples * 4);
    this.pathTex = new THREE.DataTexture(this.pathData, samples, rows, THREE.RGBAFormat, THREE.FloatType);
    this.pathTex.magFilter = this.pathTex.minFilter = THREE.NearestFilter;
    this.pathTex.needsUpdate = true;
    const dyn = <T extends THREE.BufferAttribute>(a: T) => a.setUsage(THREE.DynamicDrawUsage) as T;
    this.aPath = dyn(new THREE.BufferAttribute(new Float32Array(size), 1));
    this.aStart = dyn(new THREE.BufferAttribute(new Float32Array(size).fill(-1e6), 1));
    this.aDur = dyn(new THREE.BufferAttribute(new Float32Array(size).fill(1), 1));
    this.aJit = dyn(new THREE.BufferAttribute(new Float32Array(size * 2), 2));
    this.aColor = dyn(new THREE.BufferAttribute(new Float32Array(size * 3), 3));
    this.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(size * 3), 3));
    this.geometry.setAttribute('aPath', this.aPath);
    this.geometry.setAttribute('aStart', this.aStart);
    this.geometry.setAttribute('aDur', this.aDur);
    this.geometry.setAttribute('aJit', this.aJit);
    this.geometry.setAttribute('aColor', this.aColor);
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: SOFT_POINT_FRAG,
      transparent: true,
      depthWrite: false,
      uniforms: {
        uPaths: { value: this.pathTex },
        uRows: { value: rows },
        uSamples: { value: samples },
        uNow: { value: 0 },
        uScale: { value: 500 },
        uPixelRatio: { value: 1 },
        uSize: { value: 0.8 },
        uSpread: { value: 2.5 },
        uConverge: { value: 1 },
        uTail: { value: new THREE.Color() },
        uTailMix: { value: 0 },
      },
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.raycast = () => undefined;
  }

  get used(): number {
    return this.pool.used;
  }

  /** Write a path (resampled to `samples` points) into row `row`. */
  setPath(row: number, pts: readonly Vec3[]): void {
    const o = row * this.samples * 4;
    for (let i = 0; i < this.samples; i++) {
      const p = pts[Math.min(pts.length - 1, i)];
      this.pathData[o + i * 4] = p[0];
      this.pathData[o + i * 4 + 1] = p[1];
      this.pathData[o + i * 4 + 2] = p[2];
      this.pathData[o + i * 4 + 3] = 1;
    }
    this.pathsDirty = true;
  }

  /** Emit one particle (reuses the oldest slot once the pool is full). */
  emit(row: number, rgb: readonly [number, number, number], start: number, duration: number, jx: number, jz: number): void {
    const i = this.pool.emit();
    this.aPath.array[i] = row;
    this.aStart.array[i] = start;
    this.aDur.array[i] = duration;
    this.aJit.array[i * 2] = jx;
    this.aJit.array[i * 2 + 1] = jz;
    this.aColor.array[i * 3] = rgb[0];
    this.aColor.array[i * 3 + 1] = rgb[1];
    this.aColor.array[i * 3 + 2] = rgb[2];
    this.touched.push(i);
  }

  /** Upload what changed since the last commit (minimal update ranges). */
  commit(): void {
    if (this.pathsDirty) {
      this.pathTex.needsUpdate = true;
      this.pathsDirty = false;
    }
    if (this.touched.length === 0) return;
    const ranges = toUpdateRanges(this.touched, 64, 16);
    this.touched = [];
    for (const attr of [this.aPath, this.aStart, this.aDur, this.aJit, this.aColor]) {
      attr.clearUpdateRanges();
      for (const [s, c] of ranges) attr.addUpdateRange(s * attr.itemSize, c * attr.itemSize);
      attr.needsUpdate = true;
    }
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.pathTex.dispose();
  }
}
