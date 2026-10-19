import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../api/mock/rng';
import { diffStates } from './canopy';
import { effectiveState, toUpdateRanges, updateFilterMask, updateOverlayStates } from './canopyUpdate';
import { buildPointGrid, pickNearest, raycastGrid, type RayHit } from './spatialGrid';

function cloud(n: number, seed = 1): Float32Array {
  const rng = mulberry32(seed);
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) p.set([(rng() - 0.5) * 120, 40 + rng() * 70, (rng() - 0.5) * 120], i * 3);
  return p;
}

describe('spatial grid raycast', () => {
  const positions = cloud(20000);
  const grid = buildPointGrid(positions, 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const points = new THREE.Points(g);
  const raycaster = new THREE.Raycaster();
  const rng = mulberry32(9);

  it('finds exactly the same hits as THREE.Points.raycast', () => {
    for (let k = 0; k < 40; k++) {
      const origin = new THREE.Vector3((rng() - 0.5) * 300, 60 + rng() * 150, 150 + rng() * 100);
      const target = new THREE.Vector3((rng() - 0.5) * 80, 50 + rng() * 60, (rng() - 0.5) * 80);
      const dir = target.sub(origin).normalize();
      const threshold = 0.18 + rng() * 1.4;
      raycaster.set(origin, dir);
      raycaster.params.Points = { threshold };
      const expected = raycaster.intersectObject(points, false).map((h) => h.index).sort((a, b) => (a ?? 0) - (b ?? 0));
      const hits: RayHit[] = [];
      raycastGrid(grid, [origin.x, origin.y, origin.z], [dir.x, dir.y, dir.z], threshold, raycaster.near, raycaster.far, hits);
      expect(hits.map((h) => h.index).sort((a, b) => a - b)).toEqual(expected);
    }
  });

  it('pickNearest keeps the old choice rule (64 nearest, then closest to ray)', () => {
    const hits: RayHit[] = [
      { index: 1, distance: 5, distanceToRay: 0.5 },
      { index: 2, distance: 3, distanceToRay: 0.9 },
      { index: 3, distance: 9, distanceToRay: 0.1 },
    ];
    expect(pickNearest(hits, () => true)).toBe(3);
    expect(pickNearest(hits, (i) => i !== 3)).toBe(1);
    expect(pickNearest([], () => true)).toBeNull();
  });

  it('a ray that misses the cloud returns nothing', () => {
    const hits: RayHit[] = [];
    raycastGrid(grid, [0, 500, 0], [0, 1, 0], 1, 0, Infinity, hits);
    expect(hits).toHaveLength(0);
  });
});

describe('incremental canopy states', () => {
  it('matches the full diffStates pass over random filter/overlay sequences', () => {
    const n = 500;
    const rng = mulberry32(3);
    const reference = new Float32Array(n);
    const state = new Float32Array(n);
    const mask = new Uint8Array(n);
    let prevH: Uint32Array | null = null;
    let prevO = new Map<number, number>();
    for (let step = 0; step < 60; step++) {
      const h: Uint32Array | null = rng() < 0.3 ? null : Uint32Array.from(new Set(Array.from({ length: Math.floor(rng() * 120) }, () => Math.floor(rng() * n))));
      const o = new Map<number, number>(Array.from({ length: Math.floor(rng() * 25) }, () => [Math.floor(rng() * n), 2 + Math.floor(rng() * 3)] as [number, number]));
      for (const [i, s] of diffStates(reference, h, o)) reference[i] = s;
      updateFilterMask(mask, prevH, h);
      updateOverlayStates(state, prevO, o);
      prevH = h;
      prevO = o;
      for (let i = 0; i < n; i++) expect(effectiveState(state, mask, h !== null, i)).toBe(reference[i]);
    }
  });

  it('switching filters touches only the symmetric difference', () => {
    const mask = new Uint8Array(10);
    expect(updateFilterMask(mask, null, Uint32Array.from([1, 2, 3])).sort()).toEqual([1, 2, 3]);
    expect(updateFilterMask(mask, Uint32Array.from([1, 2, 3]), Uint32Array.from([3, 4])).sort()).toEqual([1, 2, 4]);
    expect([...mask]).toEqual([0, 0, 0, 1, 1, 0, 0, 0, 0, 0]);
  });

  it('merges update ranges', () => {
    expect(toUpdateRanges([5, 1, 3, 2000, 2001], 10)).toEqual([[1, 5], [2000, 2]]);
    expect(toUpdateRanges([])).toEqual([]);
    expect(toUpdateRanges([0, 100, 200], 10, 2)).toEqual([[0, 201]]);
  });
});
