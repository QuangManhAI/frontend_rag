/**
 * Old vs new CPU paths from docs/perf-report.md (150 000 vectors).
 * Run: npm run bench
 */
import * as THREE from 'three';
import { bench, describe } from 'vitest';
import { generateMockWorld } from '../api/mock/mockWorld';
import { parseVectors } from '../api/vectorParser';
import { applyStates, diffStates } from './canopy';
import { updateFilterMask, updateOverlayStates } from './canopyUpdate';
import { groupVectorsByCategory } from './groundLayout';
import { buildPointGrid, pickNearest, raycastGrid, type RayHit } from './spatialGrid';

const raw = generateMockWorld(7, { vectorCount: 150_000 });
const vectors = parseVectors(raw.vectorsBuffer);
const byCat = groupVectorsByCategory(vectors);

// Rays from the overview camera through the canopy.
const rays = Array.from({ length: 32 }, (_, k) => {
  const origin = new THREE.Vector3(89, 150, 154);
  const target = new THREE.Vector3(-40 + (k % 8) * 11, 60 + Math.floor(k / 8) * 12, -10 + (k % 5) * 6);
  return { origin, dir: target.sub(origin).normalize() };
});
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(vectors.positions, 3));
const points = new THREE.Points(geometry);
const raycaster = new THREE.Raycaster();
const grid = buildPointGrid(vectors.positions, 3);
const hits: RayHit[] = [];
let r = 0;

describe('hover pick (one ray, threshold 1.0)', () => {
  bench('THREE.Points.raycast (all 150k points)', () => {
    const ray = rays[r++ % rays.length];
    raycaster.set(ray.origin, ray.dir);
    raycaster.params.Points = { threshold: 1 };
    raycaster.intersectObject(points, false);
  });
  bench('spatial grid (cells near the ray)', () => {
    const ray = rays[r++ % rays.length];
    raycastGrid(grid, [ray.origin.x, ray.origin.y, ray.origin.z], [ray.dir.x, ray.dir.y, ray.dir.z], 1, 0, Infinity, hits);
    pickNearest(hits, () => true);
  });
});

describe('filter toggle (category A → category B)', () => {
  const stateOld = new Float32Array(vectors.count);
  const stateNew = new Float32Array(vectors.count);
  const mask = new Uint8Array(vectors.count);
  const empty = new Map<number, number>();
  let k = 0;
  let prev: Uint32Array | null = null;
  bench('diffStates + applyStates (full pass + Map)', () => {
    const h = byCat.get(k++ % 10) ?? null;
    applyStates(stateOld, diffStates(stateOld, h, empty));
  });
  bench('mask update (old ∪ new selection only)', () => {
    const h = byCat.get(k++ % 10) ?? null;
    updateFilterMask(mask, prev, h);
    updateOverlayStates(stateNew, empty, empty);
    prev = h;
  });
});

describe('flight overlay change (compare step, 30 entries)', () => {
  const stateOld = new Float32Array(vectors.count);
  const stateNew = new Float32Array(vectors.count);
  const overlays = Array.from({ length: 30 }, (_, n) => new Map(Array.from({ length: n + 1 }, (_, j) => [j * 4999, 2] as [number, number])));
  let k = 0;
  let prev = new Map<number, number>();
  bench('diffStates + applyStates', () => {
    applyStates(stateOld, diffStates(stateOld, null, overlays[k++ % 30]));
  });
  bench('updateOverlayStates (keys only)', () => {
    const o = overlays[k++ % 30];
    updateOverlayStates(stateNew, prev, o);
    prev = o;
  });
});
