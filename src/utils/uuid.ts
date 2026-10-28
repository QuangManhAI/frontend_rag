export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}

/** UUID v7 (RFC 9562): 48-bit unix ms timestamp, then random bits. Safe for Browser & SSR. */
export function uuidv7(now: number = Date.now()): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < 16; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // 48-bit timestamp big-endian (6 bytes)
  let t = now;
  for (let i = 5; i >= 0; i--) {
    bytes[i] = t & 0xff;
    t = Math.floor(t / 256);
  }

  // Version 7: 0111 in top 4 bits of byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // Variant 1 (RFC 4122 / 9562): 10xx in top 2 bits of byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  let hex = '';
  for (let i = 0; i < 16; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
