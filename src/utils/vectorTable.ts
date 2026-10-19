import type { CrawlVectorItem } from '../types/crawl';
import type { VectorTable } from '../types/world';

/** Allocated slots of a table (arrays may be longer than `count` once papers are appended). */
export function capacityOf(t: VectorTable): number {
  return t.positions.length / 3;
}

function grow<T extends Float32Array | Uint32Array | Uint16Array | Uint8Array>(a: T, n: number, ctor: new (n: number) => T): T {
  const b = new ctor(n);
  b.set(a.subarray(0, Math.min(a.length, n)) as unknown as ArrayLike<number>);
  return b;
}

/**
 * Append a batch in one go. When capacity runs out the arrays are reallocated to
 * ceil(needed × growth) (`grown = true`) so the canopy rebuilds its buffers only then; otherwise the
 * new rows are written past the old `count` into the same arrays. A new table header is always
 * returned (the input's `count` is never changed, so other holders of it are unaffected).
 */
export function appendToTable(t: VectorTable, items: readonly CrawlVectorItem[], growth = 1.1): { table: VectorTable; grown: boolean; start: number } {
  const start = t.count;
  const need = t.count + items.length;
  let table: VectorTable = { ...t };
  let grown = false;
  if (need > capacityOf(t)) {
    const cap = Math.ceil(need * growth);
    table = {
      count: t.count,
      positions: grow(t.positions, cap * 3, Float32Array),
      twigIds: grow(t.twigIds, cap, Uint32Array),
      crateIds: grow(t.crateIds, cap, Uint32Array),
      categories: grow(t.categories, cap, Uint16Array),
      years: grow(t.years, cap, Uint16Array),
      authority: grow(t.authority, cap, Float32Array),
      flags: grow(t.flags, cap, Uint8Array),
    };
    grown = true;
  }
  items.forEach((it, k) => {
    const i = start + k;
    table.positions.set(it.position, i * 3);
    table.twigIds[i] = it.twig_id;
    table.crateIds[i] = it.crate_id;
    table.categories[i] = it.category_index;
    table.years[i] = it.year;
    table.authority[i] = it.authority;
    table.flags[i] = 0;
  });
  table.count = need;
  return { table, grown, start };
}
