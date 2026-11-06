/** localStorage access that never throws (private mode, blocked storage, SSR). */
export function readStorage(key: string): string | null {
  try {
    return globalThis.localStorage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string): void {
  try {
    globalThis.localStorage?.setItem(key, value);
  } catch {
    /* storage unavailable — keep the in-memory value only */
  }
}

export function readJson<T>(key: string, isValid: (v: unknown) => v is T): T | null {
  const raw = readStorage(key);
  if (raw === null) return null;
  try {
    const v: unknown = JSON.parse(raw);
    return isValid(v) ? v : null;
  } catch {
    return null;
  }
}
