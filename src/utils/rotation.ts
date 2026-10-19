import * as THREE from 'three';

/** Unit complex number e^{iθ} = cos θ + i·sin θ, used as a 2D rotation step. */
export interface Rotor {
  re: number;
  im: number;
}

/** Point rotating in a plane (x = real, z = imaginary) on a circle of fixed radius. */
export interface RotationState {
  x: number;
  z: number;
  radius: number;
  /** Steps since the last renormalisation. */
  steps: number;
}

/** Renormalise every N steps: rounding error grows ~linearly, 64 keeps it far below 1e-12. */
export const RENORM_EVERY = 64;

/** The only trig call: done once per rotor, not per frame. */
export function makeRotor(theta: number): Rotor {
  return { re: Math.cos(theta), im: Math.sin(theta) };
}

/** (x + iz) · r — rotate a 2D point by the rotor's angle. */
export function rotateComplex(x: number, z: number, rotor: Rotor): [number, number] {
  return [x * rotor.re - z * rotor.im, x * rotor.im + z * rotor.re];
}

/** Compose two rotations (angles add). */
export function mulRotor(a: Rotor, b: Rotor): Rotor {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re };
}

export function makeRotationState(x: number, z: number): RotationState {
  return { x, z, radius: Math.hypot(x, z), steps: 0 };
}

/**
 * One rotation step, in place (no allocation, safe inside useFrame).
 * Every `renormEvery` steps the point is pulled back onto its circle so the radius
 * cannot drift through accumulated floating-point error.
 */
export function stepRotation(state: RotationState, rotor: Rotor, renormEvery = RENORM_EVERY): RotationState {
  const x = state.x * rotor.re - state.z * rotor.im;
  const z = state.x * rotor.im + state.z * rotor.re;
  state.x = x;
  state.z = z;
  if (++state.steps >= renormEvery) {
    state.steps = 0;
    const r = Math.hypot(x, z);
    if (r > 0) {
      const k = state.radius / r;
      state.x *= k;
      state.z *= k;
    }
  }
  return state;
}

/**
 * Fixed-timestep driver for frame-rate independent rotation: real dt varies per frame,
 * so time is accumulated and consumed in constant steps of `step` seconds (rotor = e^{iω·step}).
 * The leftover (< step) is carried to the next frame — phase lags real time by at most `step`.
 */
export interface FixedStepper {
  state: RotationState;
  rotor: Rotor;
  step: number;
  acc: number;
}

export function makeFixedStepper(omega: number, phase = 0, step = 1 / 120): FixedStepper {
  const p = makeRotor(phase);
  return { state: makeRotationState(p.re, p.im), rotor: makeRotor(omega * step), step, acc: 0 };
}

export function advanceStepper(s: FixedStepper, dt: number): FixedStepper {
  s.acc += dt;
  while (s.acc >= s.step) {
    s.acc -= s.step;
    stepRotation(s.state, s.rotor);
  }
  return s;
}

/** Spherical interpolation between two orientations; writes into `out` (reuse it in useFrame). */
export function slerpQuat(a: THREE.Quaternion, b: THREE.Quaternion, t: number, out: THREE.Quaternion = new THREE.Quaternion()): THREE.Quaternion {
  return out.slerpQuaternions(a, b, t);
}
