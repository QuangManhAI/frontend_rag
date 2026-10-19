import type { VectorTable } from '../types/world';

export const VECTOR_MAGIC = 'VTRE';
export const VECTOR_VERSION = 2;
export const VECTOR_STRIDE = 32;
export const VECTOR_HEADER = 16;

/** Decode `vectors.bin` (Mục 3.5, little-endian) into column arrays. */
export function parseVectors(buffer: ArrayBuffer): VectorTable {
  if (buffer.byteLength < VECTOR_HEADER) {
    throw new Error(`vectors.bin: header needs ${VECTOR_HEADER} bytes, got ${buffer.byteLength}`);
  }
  const dv = new DataView(buffer);
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== VECTOR_MAGIC) throw new Error(`vectors.bin: bad magic "${magic}", expected "${VECTOR_MAGIC}"`);
  const version = dv.getUint32(4, true);
  if (version !== VECTOR_VERSION) throw new Error(`vectors.bin: unsupported version ${version}, expected ${VECTOR_VERSION}`);
  const count = dv.getUint32(8, true);
  const stride = dv.getUint32(12, true);
  if (stride !== VECTOR_STRIDE) throw new Error(`vectors.bin: bad stride ${stride}, expected ${VECTOR_STRIDE}`);
  const need = VECTOR_HEADER + count * stride;
  if (buffer.byteLength < need) {
    throw new Error(`vectors.bin: truncated, ${count} records need ${need} bytes, got ${buffer.byteLength}`);
  }

  const table: VectorTable = {
    count,
    positions: new Float32Array(count * 3),
    twigIds: new Uint32Array(count),
    crateIds: new Uint32Array(count),
    categories: new Uint16Array(count),
    years: new Uint16Array(count),
    authority: new Float32Array(count),
    flags: new Uint8Array(count),
  };
  for (let i = 0; i < count; i++) {
    const o = VECTOR_HEADER + i * stride;
    table.positions[i * 3] = dv.getFloat32(o, true);
    table.positions[i * 3 + 1] = dv.getFloat32(o + 4, true);
    table.positions[i * 3 + 2] = dv.getFloat32(o + 8, true);
    table.twigIds[i] = dv.getUint32(o + 12, true);
    table.crateIds[i] = dv.getUint32(o + 16, true);
    table.categories[i] = dv.getUint16(o + 20, true);
    table.years[i] = dv.getUint16(o + 22, true);
    table.authority[i] = dv.getFloat32(o + 24, true);
    table.flags[i] = dv.getUint8(o + 28);
  }
  return table;
}

/** Inverse of parseVectors; used by the mock world and tests. */
export function encodeVectors(table: VectorTable): ArrayBuffer {
  const buffer = new ArrayBuffer(VECTOR_HEADER + table.count * VECTOR_STRIDE);
  const dv = new DataView(buffer);
  for (let i = 0; i < 4; i++) dv.setUint8(i, VECTOR_MAGIC.charCodeAt(i));
  dv.setUint32(4, VECTOR_VERSION, true);
  dv.setUint32(8, table.count, true);
  dv.setUint32(12, VECTOR_STRIDE, true);
  for (let i = 0; i < table.count; i++) {
    const o = VECTOR_HEADER + i * VECTOR_STRIDE;
    dv.setFloat32(o, table.positions[i * 3], true);
    dv.setFloat32(o + 4, table.positions[i * 3 + 1], true);
    dv.setFloat32(o + 8, table.positions[i * 3 + 2], true);
    dv.setUint32(o + 12, table.twigIds[i], true);
    dv.setUint32(o + 16, table.crateIds[i], true);
    dv.setUint16(o + 20, table.categories[i], true);
    dv.setUint16(o + 22, table.years[i], true);
    dv.setFloat32(o + 24, table.authority[i], true);
    dv.setUint8(o + 28, table.flags[i]);
  }
  return buffer;
}
