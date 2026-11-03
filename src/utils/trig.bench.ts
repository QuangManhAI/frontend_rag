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
import { mulberry32 } from '../api/mock/rng';
import { advanceStepper, makeFixedStepper, makeRotor, mulRotor, randomInDisk, ringRotors } from './rotation';

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

// ---- (A) P20: cross-section ring, sin/cos per vertex vs one rotor step (load time) ----
for (const n of [16, 32, 64]) {
  let sinkA = 0;
  describe(`A · ring of ${n} points (P20)`, () => {
    bench('cos/sin per point', () => {
      for (let j = 0; j <= n; j++) {
        const a = (j / n) * Math.PI * 2;
        sinkA += Math.cos(a) + Math.sin(a);
      }
    });
    bench('ringRotors', () => {
      const ring = ringRotors(n);
      sinkA += ring[n] + ring[n + 1];
    });
  });
}

// ---- (A) P20: whole tube cross-sections — tubeAlongPath reuses one ring for every row ----
for (const radial of [6, 10]) {
  const rows = 25; // tubularSegments 24 + 1
  let sinkT = 0;
  describe(`A · tube cross-sections, ${rows} rows × ${radial + 1} points (P20)`, () => {
    bench('cos/sin per vertex (before)', () => {
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j <= radial; j++) {
          const a = (j / radial) * Math.PI * 2;
          sinkT += -Math.cos(a) + Math.sin(a);
        }
      }
    });
    bench('ringRotors once + lookups (after)', () => {
      const ring = ringRotors(radial);
      for (let i = 0; i < rows; i++) {
        for (let j = 0; j <= radial; j++) sinkT += -ring[j * 2] + ring[j * 2 + 1];
      }
    });
  });
}

// ---- (A) P20: trunk vertices, cos/sin(a + twist) vs ring rotor × row twist rotor ----
{
  const rows = 50; // heightSegments 48 + 2
  const radial = 40;
  let sinkK = 0;
  describe(`A · trunk ${rows} rows × ${radial + 1} points (P20)`, () => {
    bench('cos/sin(a + twist) per vertex (before)', () => {
      for (let i = 0; i < rows; i++) {
        const twist = (i / 48) * 1.1;
        for (let j = 0; j <= radial; j++) {
          const a = (j / radial) * Math.PI * 2;
          sinkK += Math.cos(a + twist) + Math.sin(a + twist);
        }
      }
    });
    bench('ringRotors × makeRotor(twist) (after)', () => {
      const ring = ringRotors(radial);
      for (let i = 0; i < rows; i++) {
        const tw = makeRotor((i / 48) * 1.1);
        for (let j = 0; j <= radial; j++) {
          const d = mulRotor({ re: ring[j * 2], im: ring[j * 2 + 1] }, tw);
          sinkK += d.re + d.im;
        }
      }
    });
  });
}

// ---- (B/C) P20: FeedCables particle emission, 1000 points in the stream disk ----
{
  const rngPolar = mulberry32(5);
  const rngReject = mulberry32(5);
  const disk: [number, number] = [0, 0];
  let sinkD = 0;
  describe('B/C · 1000 disk samples per emission burst (P20)', () => {
    bench('polar: sqrt(u)·(cos, sin)', () => {
      for (let k = 0; k < 1000; k++) {
        const a = rngPolar() * Math.PI * 2;
        const d = Math.sqrt(rngPolar());
        sinkD += Math.cos(a) * d + Math.sin(a) * d;
      }
    });
    bench('randomInDisk (rejection)', () => {
      for (let k = 0; k < 1000; k++) {
        randomInDisk(rngReject, disk);
        sinkD += disk[0] + disk[1];
      }
    });
  });
}

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
