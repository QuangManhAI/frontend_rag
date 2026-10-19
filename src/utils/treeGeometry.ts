import * as THREE from 'three';
import type { Vec3 } from '../types/world';

export type Rgb = readonly [number, number, number];

function smoothstep(e0: number, e1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return t * t * (3 - 2 * t);
}

/** Root radius: thin at the crate (t = 0), thick where roots merge into the trunk (t = 1). */
export function rootRadiusAt(t: number, baseRadius = 0.15, trunkRadius = 1.2): number {
  const c = Math.min(1, Math.max(0, t));
  return baseRadius + (trunkRadius * 0.35 - baseRadius) * c * c;
}

/** Root color: crate category color blending into the trunk color. */
export function rootVertexColor(t: number, crateColor: Rgb, trunkColor: Rgb): [number, number, number] {
  const k = smoothstep(0.3, 0.9, t);
  return [
    crateColor[0] + (trunkColor[0] - crateColor[0]) * k,
    crateColor[1] + (trunkColor[1] - crateColor[1]) * k,
    crateColor[2] + (trunkColor[2] - crateColor[2]) * k,
  ];
}

export interface TubeOptions {
  radius: (t: number) => number;
  color?: (t: number) => Rgb;
  tubularSegments?: number;
  radialSegments?: number;
  /** Node id written to the `branchId` attribute (for highlight lookup). */
  branchId?: number;
}

/**
 * Tube along a Catmull-Rom curve through `path` with a radius that varies along t.
 * Always emits position/normal/uv/color/branchId so tubes can be merged with the trunk.
 * Vertex count = (tubularSegments + 1) * (radialSegments + 1).
 */
export function tubeAlongPath(path: readonly Vec3[], opts: TubeOptions): THREE.BufferGeometry {
  const tubular = opts.tubularSegments ?? 24;
  const radial = opts.radialSegments ?? 8;
  const pts = path.map((p) => new THREE.Vector3(p[0], p[1], p[2]));
  if (pts.length === 1) pts.push(pts[0].clone().add(new THREE.Vector3(0, 0.01, 0)));
  const curve = new THREE.CatmullRomCurve3(pts, false, 'centripetal');
  const frames = curve.computeFrenetFrames(tubular, false);

  const n = (tubular + 1) * (radial + 1);
  const position = new Float32Array(n * 3);
  const normal = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const color = new Float32Array(n * 3);
  const branchId = new Float32Array(n).fill(opts.branchId ?? 0);
  const p = new THREE.Vector3();
  const nv = new THREE.Vector3();
  let v = 0;
  for (let i = 0; i <= tubular; i++) {
    const t = i / tubular;
    curve.getPointAt(t, p);
    const r = opts.radius(t);
    const N = frames.normals[i];
    const B = frames.binormals[i];
    const rgb = opts.color ? opts.color(t) : ([1, 1, 1] as const);
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const s = Math.sin(a);
      const c = -Math.cos(a);
      nv.set(c * N.x + s * B.x, c * N.y + s * B.y, c * N.z + s * B.z).normalize();
      position[v * 3] = p.x + r * nv.x;
      position[v * 3 + 1] = p.y + r * nv.y;
      position[v * 3 + 2] = p.z + r * nv.z;
      normal[v * 3] = nv.x;
      normal[v * 3 + 1] = nv.y;
      normal[v * 3 + 2] = nv.z;
      uv[v * 2] = j / radial;
      uv[v * 2 + 1] = t;
      color[v * 3] = rgb[0];
      color[v * 3 + 1] = rgb[1];
      color[v * 3 + 2] = rgb[2];
      v++;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < tubular; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(color, 3));
  g.setAttribute('branchId', new THREE.BufferAttribute(branchId, 1));
  g.setIndex(index);
  return g;
}

function bark(angle: number, y: number, seed: number): number {
  return (
    Math.sin(angle * 5 + y * 0.35 + seed) * 0.5 +
    Math.sin(angle * 11 - y * 0.9 + seed * 2.1) * 0.3 +
    Math.sin(angle * 23 + y * 2.3 + seed * 0.7) * 0.2
  );
}

export interface TrunkOptions {
  height?: number;
  baseRadius?: number;
  topRadius?: number;
  radialSegments?: number;
  heightSegments?: number;
  color: Rgb;
  seed?: number;
}

/** Gnarled, tapering trunk from y = 0 to `height` with a flared base and a closed top. */
export function buildTrunkGeometry(o: TrunkOptions): THREE.BufferGeometry {
  const H = o.height ?? 35;
  const r0 = o.baseRadius ?? 4.2;
  const r1 = o.topRadius ?? 2.1;
  const radial = o.radialSegments ?? 40;
  const segs = o.heightSegments ?? 48;
  const seed = o.seed ?? 1.7;
  const rows = segs + 2;
  const n = rows * (radial + 1);
  const position = new Float32Array(n * 3);
  const uv = new Float32Array(n * 2);
  const color = new Float32Array(n * 3);
  let v = 0;
  for (let i = 0; i < rows; i++) {
    const isCap = i === rows - 1;
    const f = Math.min(1, i / segs);
    const y = isCap ? H + 1.5 : f * H - 0.6;
    const twist = f * 1.1;
    for (let j = 0; j <= radial; j++) {
      const a = (j / radial) * Math.PI * 2;
      const flare = 3.4 * Math.exp(-Math.max(0, y) / 2.6) * (0.75 + 0.25 * Math.sin(a * 5 + seed));
      let r = r0 + (r1 - r0) * Math.pow(f, 0.8) + flare + bark(a + twist, y, seed) * 0.32 * (1 - f * 0.4);
      if (isCap) r = 0.5;
      position[v * 3] = Math.cos(a + twist) * r;
      position[v * 3 + 1] = y;
      position[v * 3 + 2] = Math.sin(a + twist) * r;
      uv[v * 2] = j / radial;
      uv[v * 2 + 1] = isCap ? 1 : f;
      color[v * 3] = o.color[0];
      color[v * 3 + 1] = o.color[1];
      color[v * 3 + 2] = o.color[2];
      v++;
    }
  }
  const index: number[] = [];
  for (let i = 0; i < rows - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j;
      const b = (i + 1) * (radial + 1) + j;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(position, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(color, 3));
  g.setAttribute('branchId', new THREE.BufferAttribute(new Float32Array(n), 1));
  g.setIndex(index);
  g.computeVertexNormals();
  return g;
}

export interface SapParticles {
  pathIndex: Float32Array;
  phase: Float32Array;
  speed: Float32Array;
  count: number;
}

/** Particles riding each path; the shader moves them by (time * speed + phase) % 1. */
export function buildSapParticles(paths: readonly (readonly Vec3[])[], particlesPerPath: number, rng: () => number = Math.random): SapParticles {
  const count = paths.length * particlesPerPath;
  const pathIndex = new Float32Array(count);
  const phase = new Float32Array(count);
  const speed = new Float32Array(count);
  let k = 0;
  for (let p = 0; p < paths.length; p++) {
    for (let i = 0; i < particlesPerPath; i++) {
      pathIndex[k] = p;
      phase[k] = (i + rng() * 0.8) / particlesPerPath;
      speed[k] = 0.045 + rng() * 0.04;
      k++;
    }
  }
  return { pathIndex, phase, speed, count };
}
