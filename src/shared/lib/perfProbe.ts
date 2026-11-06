/**
 * Opt-in timing probe for perf audits (docs/perf-report.md). Enabled in DEV or with `?bench`
 * (also in production builds), otherwise every call is a no-op.
 */
export const PERF_ENABLED = (() => {
  try {
    return import.meta.env.DEV || new URLSearchParams(globalThis.location?.search ?? '').has('bench');
  } catch {
    return false;
  }
})();

/**
 * `?bench&legacyfx`: reproduce the pre-optimisation GPU settings (composer MSAA 4×, canvas AA, no FXAA,
 * old bloom threshold/intensity, full-size sprites without alpha discard) for A/B timing in one build.
 */
export const LEGACY_FX = PERF_ENABLED && new URLSearchParams(globalThis.location?.search ?? '').has('legacyfx');

export const perfStats: Record<string, number[]> = {};

export function timed<T>(name: string, fn: () => T): T {
  if (!PERF_ENABLED) return fn();
  const t0 = performance.now();
  const out = fn();
  (perfStats[name] ??= []).push(performance.now() - t0);
  return out;
}
