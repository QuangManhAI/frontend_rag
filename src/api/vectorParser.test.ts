import { describe, expect, it } from 'vitest';
import type { VectorTable } from '../types/world';
import { encodeVectors, parseVectors } from './vectorParser';

function sample(): VectorTable {
  return {
    count: 2,
    positions: new Float32Array([1.5, 2.5, -3.25, 10, 60, 7]),
    twigIds: new Uint32Array([15, 200]),
    crateIds: new Uint32Array([3, 4]),
    categories: new Uint16Array([0, 9]),
    years: new Uint16Array([2019, 2024]),
    authority: new Float32Array([0.25, 1]),
    flags: new Uint8Array([1, 0]),
  };
}

describe('vectorParser', () => {
  it('round-trips encode → parse', () => {
    const t = sample();
    const parsed = parseVectors(encodeVectors(t));
    expect(parsed.count).toBe(2);
    expect([...parsed.positions]).toEqual([...t.positions]);
    expect([...parsed.twigIds]).toEqual([15, 200]);
    expect([...parsed.crateIds]).toEqual([3, 4]);
    expect([...parsed.categories]).toEqual([0, 9]);
    expect([...parsed.years]).toEqual([2019, 2024]);
    expect([...parsed.authority]).toEqual([0.25, 1]);
    expect([...parsed.flags]).toEqual([1, 0]);
  });

  it('writes the 16-byte header little-endian', () => {
    const dv = new DataView(encodeVectors(sample()));
    expect(String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3))).toBe('VTRE');
    expect(dv.getUint32(4, true)).toBe(2);
    expect(dv.getUint32(8, true)).toBe(2);
    expect(dv.getUint32(12, true)).toBe(32);
    expect(dv.byteLength).toBe(16 + 2 * 32);
  });

  it('rejects a bad magic', () => {
    const buf = encodeVectors(sample());
    new DataView(buf).setUint8(0, 'X'.charCodeAt(0));
    expect(() => parseVectors(buf)).toThrow(/magic/);
  });

  it('rejects an unknown version and stride', () => {
    const v = encodeVectors(sample());
    new DataView(v).setUint32(4, 3, true);
    expect(() => parseVectors(v)).toThrow(/version 3/);
    const s = encodeVectors(sample());
    new DataView(s).setUint32(12, 28, true);
    expect(() => parseVectors(s)).toThrow(/stride 28/);
  });

  it('rejects truncated buffers', () => {
    const buf = encodeVectors(sample()).slice(0, 16 + 40);
    expect(() => parseVectors(buf)).toThrow(/truncated/);
    expect(() => parseVectors(new ArrayBuffer(8))).toThrow(/header/);
  });
});
