import * as THREE from 'three';
import type { Vec3 } from '../../../types/world';
import { ParticlePool } from '../../../utils/crawlFlow';
import { toUpdateRanges } from '../../../utils/canopyUpdate';

const VERT = /* glsl */ `
  attribute vec2 corner;
  attribute float aPath;
  attribute float aStart;
  attribute float aDur;
  attribute vec2 aJit;
  attribute vec3 aColor;
  attribute vec2 aShape;
  uniform sampler2D uPaths;
  uniform float uRows;
  uniform float uSamples;
  uniform float uNow;
  uniform float uScale;
  uniform float uSize;
  uniform float uMinPx;
  uniform float uSpread;
  uniform float uConverge;
  uniform float uFadeIn;
  uniform vec3 uTail;
  uniform float uTailMix;
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vUv;

  vec3 pathAt(float t) {
    float f = clamp(t, 0.0, 1.0) * (uSamples - 1.0);
    float i0 = floor(f);
    float v = (aPath + 0.5) / uRows;
    vec3 a = texture2D(uPaths, vec2((i0 + 0.5) / uSamples, v)).xyz;
    vec3 b = texture2D(uPaths, vec2((min(i0 + 1.0, uSamples - 1.0) + 0.5) / uSamples, v)).xyz;
    return mix(a, b, f - i0);
  }

  void main() {
    float t = (uNow - aStart) / aDur;
    vUv = corner;
    if (t < 0.0 || t > 1.0) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      vAlpha = 0.0;
      vColor = vec3(0.0);
      return;
    }
    // uConverge 1: wide at the start, converging onto the path end; 0: constant width.
    float spread = mix(1.0, (1.0 - t) * (1.0 - t), uConverge) * uSpread;
    vec3 p = pathAt(t);
    p.xz += aJit * spread;
    vec3 back = pathAt(t - 0.02);
    back.xz += aJit * spread;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    vec3 dir = (modelViewMatrix * vec4(p - back, 0.0)).xyz;
    float dl = length(dir);
    dir = dl > 1e-5 ? dir / dl : vec3(0.0, 1.0, 0.0);
    // Camera-facing streak: the long side follows the motion, the short side faces the viewer.
    vec3 side = cross(dir, normalize(mv.xyz));
    float sl = length(side);
    side = sl > 1e-4 ? side / sl : vec3(1.0, 0.0, 0.0);
    // Never thinner than uMinPx CSS pixels (world units per CSS pixel at this depth = -z / uScale).
    float width = max(uSize * aShape.x, uMinPx * -mv.z / uScale);
    float len = width * aShape.y;
    mv.xyz += side * (corner.y * width * 0.5) - dir * (corner.x * len);
    gl_Position = projectionMatrix * mv;
    vColor = mix(aColor, uTail, smoothstep(0.35, 0.9, t) * uTailMix) * (1.0 + 0.7 * smoothstep(0.85, 1.0, t));
    vAlpha = smoothstep(0.0, uFadeIn, t) * (1.0 - smoothstep(0.93, 1.0, t));
  }
`;

const FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying vec2 vUv;
  uniform float uGain;
  void main() {
    // x: 0 head → 1 tail; y: -1..1 across.
    float across = 1.0 - vUv.y * vUv.y;
    float tail = pow(clamp(1.0 - vUv.x, 0.0, 1.0), 1.6);
    float head = pow(clamp(1.0 - vUv.x, 0.0, 1.0), 6.0);
    float a = across * tail * vAlpha;
    if (a < 0.004) discard;
    gl_FragColor = vec4(vColor * (0.8 + 1.4 * head * across) * uGain, a);
  }
`;

/**
 * A fixed pool of path-following streaks (head bright, tail fading; length 3–6× the width) in ONE
 * instanced mesh. Paths live in a float DataTexture (one row per path, `samples` points each);
 * the CPU only writes a particle's slot when it is emitted. No allocation happens per frame.
 */
export class StreamParticles {
  readonly object: THREE.Mesh;
  readonly material: THREE.ShaderMaterial;
  private readonly geometry = new THREE.InstancedBufferGeometry();
  private readonly pathData: Float32Array;
  private readonly pathTex: THREE.DataTexture;
  private readonly pool: ParticlePool;
  private readonly aPath: THREE.InstancedBufferAttribute;
  private readonly aStart: THREE.InstancedBufferAttribute;
  private readonly aDur: THREE.InstancedBufferAttribute;
  private readonly aJit: THREE.InstancedBufferAttribute;
  private readonly aColor: THREE.InstancedBufferAttribute;
  private readonly aShape: THREE.InstancedBufferAttribute;
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
    const inst = (n: number, item: number, fill = 0) => new THREE.InstancedBufferAttribute(new Float32Array(n * item).fill(fill), item).setUsage(THREE.DynamicDrawUsage);
    this.aPath = inst(size, 1);
    this.aStart = inst(size, 1, -1e6);
    this.aDur = inst(size, 1, 1);
    this.aJit = inst(size, 2);
    this.aColor = inst(size, 3);
    this.aShape = inst(size, 2, 1);
    // Quad: x 0 (head) → 1 (tail), y −1 → 1 across.
    this.geometry.setAttribute('corner', new THREE.Float32BufferAttribute([0, -1, 0, 1, 1, -1, 1, 1], 2));
    this.geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(12), 3));
    this.geometry.setIndex([0, 2, 1, 1, 2, 3]);
    this.geometry.setAttribute('aPath', this.aPath);
    this.geometry.setAttribute('aStart', this.aStart);
    this.geometry.setAttribute('aDur', this.aDur);
    this.geometry.setAttribute('aJit', this.aJit);
    this.geometry.setAttribute('aColor', this.aColor);
    this.geometry.setAttribute('aShape', this.aShape);
    this.geometry.instanceCount = size;
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uPaths: { value: this.pathTex },
        uRows: { value: rows },
        uSamples: { value: samples },
        uNow: { value: 0 },
        uScale: { value: 500 },
        uSize: { value: 0.3 },
        uMinPx: { value: 1.6 },
        uSpread: { value: 2.5 },
        uConverge: { value: 1 },
        uFadeIn: { value: 0.05 },
        uTail: { value: new THREE.Color() },
        uTailMix: { value: 0 },
        uGain: { value: 1 },
      },
    });
    this.object = new THREE.Mesh(this.geometry, this.material);
    this.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -40, 0), 120);
    this.object.frustumCulled = true;
    this.object.raycast = () => undefined;
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

  /**
   * Emit one streak (reuses the oldest slot once the pool is full). `width` scales uSize;
   * `length` is the streak length in widths.
   */
  emit(row: number, rgb: readonly [number, number, number], start: number, duration: number, jx: number, jz: number, width = 1, length = 4): void {
    const i = this.pool.emit();
    this.aPath.array[i] = row;
    this.aStart.array[i] = start;
    this.aDur.array[i] = duration;
    this.aJit.array[i * 2] = jx;
    this.aJit.array[i * 2 + 1] = jz;
    this.aColor.array[i * 3] = rgb[0];
    this.aColor.array[i * 3 + 1] = rgb[1];
    this.aColor.array[i * 3 + 2] = rgb[2];
    this.aShape.array[i * 2] = width;
    this.aShape.array[i * 2 + 1] = length;
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
    for (const attr of [this.aPath, this.aStart, this.aDur, this.aJit, this.aColor, this.aShape]) {
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
