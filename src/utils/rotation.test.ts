import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { advanceStepper, makeFixedStepper, makeRotationState, makeRotor, mulRotor, rotateComplex, slerpQuat, stepRotation } from './rotation';

describe('rotation (complex rotors)', () => {
  it('four 90° turns return to the starting point', () => {
    const r = makeRotor(Math.PI / 2);
    let p: [number, number] = [3, -1.5];
    for (let i = 0; i < 4; i++) p = rotateComplex(p[0], p[1], r);
    expect(p[0]).toBeCloseTo(3, 12);
    expect(p[1]).toBeCloseTo(-1.5, 12);
    expect(rotateComplex(1, 0, r)[1]).toBeCloseTo(1, 12);
  });

  it('composing rotors adds angles', () => {
    const r = mulRotor(makeRotor(0.3), makeRotor(0.5));
    expect(r.re).toBeCloseTo(Math.cos(0.8), 14);
    expect(r.im).toBeCloseTo(Math.sin(0.8), 14);
  });

  it('10 000 small steps keep the radius (renormalised) and match direct cos/sin', () => {
    const theta = 0.0123;
    const rotor = makeRotor(theta);
    const s = makeRotationState(7, 2);
    for (let i = 0; i < 10_000; i++) stepRotation(s, rotor);
    // 10 000 is not a multiple of 64 → check radius after the last renormalisation too.
    expect(Math.abs(Math.hypot(s.x, s.z) - s.radius)).toBeLessThan(1e-6);
    // Position matches the closed form at angle n·θ well under the 1e-3 visual budget.
    const a = Math.atan2(2, 7) + 10_000 * theta;
    expect(Math.abs(s.x - s.radius * Math.cos(a))).toBeLessThan(1e-3);
    expect(Math.abs(s.z - s.radius * Math.sin(a))).toBeLessThan(1e-3);
  });

  it('without renormalisation the radius would drift more', () => {
    const rotor = { re: Math.cos(0.01) * (1 + 1e-9), im: Math.sin(0.01) * (1 + 1e-9) }; // slightly non-unit
    const raw = makeRotationState(1, 0);
    const fixed = makeRotationState(1, 0);
    for (let i = 0; i < 10_000; i++) {
      stepRotation(raw, rotor, Number.POSITIVE_INFINITY);
      stepRotation(fixed, rotor);
    }
    expect(Math.abs(Math.hypot(raw.x, raw.z) - 1)).toBeGreaterThan(1e-6);
    expect(Math.abs(Math.hypot(fixed.x, fixed.z) - 1)).toBeLessThan(1e-6);
  });

  it('fixed stepper is frame-rate independent up to one step', () => {
    const omega = 4.4;
    const a = makeFixedStepper(omega);
    const b = makeFixedStepper(omega);
    for (let i = 0; i < 600; i++) advanceStepper(a, 1 / 60);
    for (let i = 0; i < 300; i++) advanceStepper(b, 1 / 30);
    expect(Math.abs(a.state.z - b.state.z)).toBeLessThan(omega / 120 + 1e-9);
  });
});

describe('slerpQuat', () => {
  const a = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.2);
  const b = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.3);
  it('t = 0 gives the start, t = 1 the end', () => {
    expect(slerpQuat(a, b, 0).angleTo(a)).toBeLessThan(1e-7);
    expect(slerpQuat(a, b, 1).angleTo(b)).toBeLessThan(1e-7);
  });
  it('writes into the provided output (no allocation)', () => {
    const out = new THREE.Quaternion();
    expect(slerpQuat(a, b, 0.5, out)).toBe(out);
    expect(out.length()).toBeCloseTo(1, 10);
  });
});
