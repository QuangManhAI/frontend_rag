/**
 * Per-frame CPU cost of the trig call sites found by docs/trig-audit.md, sin vs complex rotor,
 * plus the scene's real CPU hot spots for scale. Run: npx vitest bench --run src/utils/trig.bench.ts
 * One bench iteration = one simulated frame (dt = 1/60 s).
 */
import * as THREE from 'three';
import { bench, describe } from 'vitest';
import { generateMockWorld } from '../api/mock/mockWorld';
import { parseVectors } from '../api/vectorParser';
import { darkTheme } from '../theme/tokens';
import { buildCanopyColors, diffStates } from './canopy';
import { advanceStepper, makeFixedStepper } from './rotation';

const DT = 1 / 60;
const BREATHE = 1.4;

// ---- (B) QueryFlight breathing: one sin per frame ----
let tB = 0;
let sinkB = 0;
const breather = makeFixedStepper((Math.PI * 2) / BREATHE);
describe('B · orb breathing (1 object / frame)', () => {
  bench('Math.sin', () => {
    tB += DT;
    sinkB += 1 + 0.09 * Math.sin((tB * Math.PI * 2) / BREATHE);
  });
  bench('complex rotor (fixed step 1/120)', () => {
    advanceStepper(breather, DT);
    sinkB += 1 + 0.09 * breather.state.z;
  });
});

// ---- (C) GroundGrid pulse: one sin per pulsing crate per frame, then setColorAt ----
function pulseSection(n: number) {
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial(), 576);
  mesh.setColorAt(0, new THREE.Color());
  const base = new Float32Array(576 * 3).fill(0.5);
  const ids = Array.from({ length: n }, (_, i) => i * 7);
  const tmp = new THREE.Color();
  const steppers = ids.map((id) => makeFixedStepper(5, id));
  let t = 0;
  return {
    sin() {
      t += DT;
      for (const id of ids) {
        const k = 1 + 1.4 * (0.5 + 0.5 * Math.sin(t * 5 + id));
        mesh.setColorAt(id, tmp.fromArray(base, id * 3).multiplyScalar(k));
      }
    },
    rotor() {
      for (let i = 0; i < ids.length; i++) {
        const s = advanceStepper(steppers[i], DT);
        const k = 1 + 1.4 * (0.5 + 0.5 * s.state.z);
        mesh.setColorAt(ids[i], tmp.fromArray(base, ids[i] * 3).multiplyScalar(k));
      }
    },
    sinOnly() {
      t += DT;
      for (const id of ids) sinkB += Math.sin(t * 5 + id);
    },
    rotorOnly() {
      for (const s of steppers) sinkB += advanceStepper(s, DT).state.z;
    },
  };
}
for (const n of [5, 20]) {
  const p = pulseSection(n);
  describe(`C · ground pulse, ${n} crates (whole section)`, () => {
    bench('Math.sin', p.sin);
    bench('complex rotor', p.rotor);
  });
  describe(`C · ground pulse, ${n} crates (trig only)`, () => {
    bench('Math.sin', p.sinOnly);
    bench('complex rotor', p.rotorOnly);
  });
}

// ---- Context: what actually costs CPU in this scene (150 000 vectors) ----
const raw = generateMockWorld(7, { vectorCount: 150_000 });
const vectors = parseVectors(raw.vectorsBuffer);
const state = new Float32Array(vectors.count);
const overlay = new Map([[10, 3], [20, 4]]);
const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(vectors.positions, 3));
const points = new THREE.Points(geometry);
const raycaster = new THREE.Raycaster(new THREE.Vector3(0, 140, 180), new THREE.Vector3(0, -0.35, -1).normalize());
raycaster.params.Points = { threshold: 1 };
const colors = new Float32Array(vectors.count * 3);

describe('context · scene hot spots (150k vectors)', () => {
  bench('diffStates (each overlay/filter change)', () => {
    diffStates(state, null, overlay);
  });
  bench('Points raycast (hover pick, every 30 ms)', () => {
    raycaster.intersectObject(points, false);
  });
  bench('buildCanopyColors (theme change)', () => {
    buildCanopyColors(vectors, darkTheme, colors);
  });
});
