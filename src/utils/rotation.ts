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

/** r^n — the rotation applied n times (n ≥ 0 integer), by binary exponentiation. */
export function powRotor(r: Rotor, n: number): Rotor {
  let out: Rotor = { re: 1, im: 0 };
  let base = r;
  for (let k = n; k > 0; k >>= 1) {
    if (k & 1) out = mulRotor(out, base);
    base = mulRotor(base, base);
  }
  return out;
}

/**
 * The n+1 points e^{i·2πj/n}, j = 0…n, of a closed ring as interleaved (re, im) pairs, walked with
 * one rotor step instead of a sin/cos pair per point. The last point closes the seam (≈ the first).
 */
export function ringRotors(n: number): Float64Array {
  const step = makeRotor((2 * Math.PI) / n);
  const out = new Float64Array((n + 1) * 2);
  let re = 1;
  let im = 0;
  for (let j = 0; j <= n; j++) {
    out[j * 2] = re;
    out[j * 2 + 1] = im;
    const next = re * step.re - im * step.im;
    im = re * step.im + im * step.re;
    re = next;
    if ((j + 1) % RENORM_EVERY === 0) {
      const h = Math.hypot(re, im);
      re /= h;
      im /= h;
    }
  }
  return out;
}

/**
 * Uniform point in the unit disk by rejection sampling: same distribution as
 * sqrt(u)·(cos 2πv, sin 2πv) without trig or sqrt (1.27 tries on average). Writes into `out`.
 */
export function randomInDisk(rng: () => number, out: [number, number] = [0, 0]): [number, number] {
  let x: number;
  let y: number;
  do {
    x = rng() * 2 - 1;
    y = rng() * 2 - 1;
  } while (x * x + y * y > 1);
  out[0] = x;
  out[1] = y;
  return out;
}

/** Uniform direction on the unit circle as a rotor (a disk sample pushed out to radius 1). */
export function randomDirection(rng: () => number): Rotor {
  const p: [number, number] = [0, 0];
  let h = 0;
  while (h < 1e-6) {
    randomInDisk(rng, p);
    h = Math.hypot(p[0], p[1]);
  }
  return { re: p[0] / h, im: p[1] / h };
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
