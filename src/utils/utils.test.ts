import { describe, expect, it, vi } from 'vitest';
import { darkTheme } from '../theme/tokens';
import type { TreeNode, VectorTable, Vec3 } from '../types/world';
import { toArxivUrl } from './arxiv';
import { FOCUS_DISTANCE, getPreset } from './cameraPresets';
import { applyStates, buildCanopyAttributes, diffStates, hexToRgb, VectorState } from './canopy';
import { splitCitations } from './citations';
import { buildCompareTour, buildFlightPaths, compareDwell, dist, polylineLength, samplePolyline } from './flight';
import { cellToWorld, crateHeight, groupVectorsByCategory, groupVectorsByCrate } from './groundLayout';
import { lodLevel } from './lod';
import { resolveResultCase } from './resultCase';
import { buildSapParticles, rootRadiusAt, rootVertexColor, tubeAlongPath } from './treeGeometry';

function table(n: number): VectorTable {
  const t: VectorTable = {
    count: n,
    positions: new Float32Array(n * 3),
    twigIds: new Uint32Array(n),
    crateIds: new Uint32Array(n),
    categories: new Uint16Array(n),
    years: new Uint16Array(n).fill(2020),
    authority: new Float32Array(n),
    flags: new Uint8Array(n),
  };
  for (let i = 0; i < n; i++) {
    t.positions.set([i, 50 + i, 0], i * 3);
    t.crateIds[i] = i % 3;
    t.categories[i] = i % 2;
    t.authority[i] = i / Math.max(1, n - 1);
  }
  return t;
}

describe('citations.splitCitations', () => {
  it('a copied context header [Paper ID: id | …] becomes one chip', () => {
    expect(splitCitations('See [Paper ID: 2403.04303 | Title: "LORS" | Section: Method].')).toEqual([
      { kind: 'text', value: 'See ' },
      { kind: 'citation', paperId: '2403.04303' },
      { kind: 'text', value: '.' },
    ]);
  });
  it('one id', () => {
    expect(splitCitations('LoRA works [Paper: 2310.00297].')).toEqual([
      { kind: 'text', value: 'LoRA works ' },
      { kind: 'citation', paperId: '2310.00297' },
      { kind: 'text', value: '.' },
    ]);
  });
  it('several ids in one bracket', () => {
    const parts = splitCitations('[Paper: 2310.00297, 2401.12345]');
    expect(parts).toEqual([
      { kind: 'citation', paperId: '2310.00297' },
      { kind: 'citation', paperId: '2401.12345' },
    ]);
  });
  it('no citation', () => {
    expect(splitCitations('plain text')).toEqual([{ kind: 'text', value: 'plain text' }]);
    expect(splitCitations('')).toEqual([]);
  });
  it('next to LaTeX', () => {
    const parts = splitCitations('$L = \\sum_i x_i$ [Paper: a]$x$');
    expect(parts.map((p) => p.kind)).toEqual(['text', 'citation', 'text']);
    expect(parts[0]).toEqual({ kind: 'text', value: '$L = \\sum_i x_i$ ' });
  });
});

describe('cameraPresets', () => {
  it('ground camera sits low near the ground', () => {
    const p = getPreset('ground');
    expect(p.position[1]).toBeLessThan(15);
    expect(p.position[1]).toBeGreaterThan(0);
    expect(p.target[1]).toBeLessThan(0);
  });
  it('canopy camera is above the trunk', () => {
    expect(getPreset('canopy').position[1]).toBeGreaterThan(35);
    expect(getPreset('canopy').target[1]).toBeGreaterThan(35);
  });
  it('focus keeps a fixed distance from the point', () => {
    const point: Vec3 = [20, 90, -10];
    const p = getPreset('focus', { point });
    expect(dist(p.position, point)).toBeCloseTo(FOCUS_DISTANCE, 5);
    expect(p.target).toEqual(point);
    expect(dist(getPreset('focus', { point: [0, 80, 0] }).position, [0, 80, 0])).toBeCloseTo(FOCUS_DISTANCE, 5);
  });
  it('overview looks down at ~30°', () => {
    const { position: p, target: t } = getPreset('overview');
    const pitch = Math.atan2(p[1] - t[1], Math.hypot(p[0] - t[0], p[2] - t[2]));
    expect((pitch * 180) / Math.PI).toBeCloseTo(30, 0);
  });
});

describe('lod', () => {
  it('counts thresholds passed', () => {
    expect(lodLevel(5, [10, 50])).toBe(0);
    expect(lodLevel(20, [10, 50])).toBe(1);
    expect(lodLevel(80, [10, 50])).toBe(2);
    expect(lodLevel(10, [10, 50])).toBe(0);
    expect(lodLevel(1, [])).toBe(0);
  });
});

describe('groundLayout', () => {
  it('cellToWorld at the corner and center', () => {
    expect(cellToWorld([0, 0], [24, 24], 3)).toEqual([-34.5, 0, -34.5]);
    expect(cellToWorld([23, 23], [24, 24], 3)).toEqual([34.5, 0, 34.5]);
    expect(cellToWorld([1, 1], [3, 3], 2)).toEqual([0, 0, 0]);
  });
  it('crateHeight at 0 and max', () => {
    expect(crateHeight(0, 100)).toBe(2);
    expect(crateHeight(100, 100)).toBe(12);
    expect(crateHeight(25, 100)).toBe(7);
    expect(crateHeight(5, 0)).toBe(2);
  });
  it('groups every vector exactly once', () => {
    const t = table(10);
    const byCrate = groupVectorsByCrate(t);
    expect([...byCrate.values()].reduce((a, v) => a + v.length, 0)).toBe(10);
    expect([...(byCrate.get(0) ?? [])]).toEqual([0, 3, 6, 9]);
    expect(groupVectorsByCategory(t).get(1)?.length).toBe(5);
  });
});

describe('treeGeometry', () => {
  it('root radius grows with t', () => {
    let prev = -1;
    for (let t = 0; t <= 1.0001; t += 0.1) {
      const r = rootRadiusAt(t);
      expect(r).toBeGreaterThanOrEqual(prev);
      prev = r;
    }
    expect(rootRadiusAt(0)).toBeCloseTo(0.15);
    expect(rootRadiusAt(1)).toBeCloseTo(1.2 * 0.35);
  });
  it('root color goes from crate color to trunk color', () => {
    expect(rootVertexColor(0, [1, 0, 0], [0, 0, 1])).toEqual([1, 0, 0]);
    expect(rootVertexColor(1, [1, 0, 0], [0, 0, 1])).toEqual([0, 0, 1]);
  });
  it('tube vertex count = (tubular+1)*(radial+1)', () => {
    const g = tubeAlongPath([[0, 0, 0], [1, 2, 0], [3, 3, 1]], { radius: () => 0.5, tubularSegments: 10, radialSegments: 6, branchId: 7 });
    expect(g.attributes.position.count).toBe(11 * 7);
    expect(g.attributes.branchId.getX(0)).toBe(7);
    expect(g.index?.count).toBe(10 * 6 * 6);
  });
  it('sap particles per path', () => {
    const s = buildSapParticles([[[0, 0, 0]], [[1, 1, 1]]], 4, () => 0.5);
    expect(s.count).toBe(8);
    expect([...s.pathIndex]).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
  });
});

describe('canopy', () => {
  it('attribute lengths match the count', () => {
    const t = table(7);
    const a = buildCanopyAttributes(t, darkTheme);
    expect(a.color.length).toBe(21);
    expect(a.size.length).toBe(7);
    expect(a.phase.length).toBe(7);
    expect(a.state.length).toBe(7);
    expect(a.position).toBe(t.positions);
  });
  it('size grows with authority', () => {
    const a = buildCanopyAttributes(table(5), darkTheme);
    for (let i = 1; i < 5; i++) expect(a.size[i]).toBeGreaterThan(a.size[i - 1]);
    expect(a.size[0]).toBeCloseTo(0.6);
    expect(a.size[4]).toBeCloseTo(1.8);
  });
  it('hexToRgb', () => {
    expect(hexToRgb('#ff0000')).toEqual([1, 0, 0]);
    expect(hexToRgb('#000000')).toEqual([0, 0, 0]);
    expect(hexToRgb('#ffffff80')).toEqual([1, 1, 1]);
    const [, g] = hexToRgb('#00ff00');
    expect(g).toBe(1);
  });
  it('applyStates only touches changed indices', () => {
    const s = new Float32Array(10);
    s[4] = 2;
    const range = applyStates(s, new Map([[2, 3], [4, 2], [7, 1]]));
    expect(range).toEqual([2, 7]);
    expect([...s]).toEqual([0, 0, 3, 0, 2, 0, 0, 1, 0, 0]);
    expect(applyStates(s, new Map([[2, 3]]))).toBeNull();
  });
  it('diffStates dims everything outside highlights; overlay wins', () => {
    const cur = new Float32Array(4);
    const changes = diffStates(cur, new Uint32Array([1]), new Map([[2, VectorState.topK]]));
    expect([...changes]).toEqual([[0, 1], [2, 3], [3, 1]]);
  });
});

describe('flight', () => {
  const line: Vec3[] = [[0, 0, 0], [10, 0, 0], [10, 10, 0]];
  it('samplePolyline at 0, 0.5, 1', () => {
    expect(polylineLength(line)).toBe(20);
    expect(samplePolyline(line, 0)).toEqual([0, 0, 0]);
    expect(samplePolyline(line, 0.5)).toEqual([10, 0, 0]);
    expect(samplePolyline(line, 0.75)).toEqual([10, 5, 0]);
    expect(samplePolyline(line, 1)).toEqual([10, 10, 0]);
  });

  const node = (id: number, parent: number | null, depth: 0 | 1 | 2, p: Vec3): TreeNode => ({
    id, parent_id: parent, depth, label: '', leaf_count: 0, dominant_category: 0, position: p, path: [], radius: 1,
  });
  const nodes = new Map([
    [0, node(0, null, 0, [0, 35, 0])],
    [1, node(1, 0, 1, [20, 60, 0])],
    [2, node(2, 0, 1, [-20, 60, 0])],
    [3, node(3, 1, 2, [30, 80, 0])],
    [4, node(4, 1, 2, [25, 85, 5])],
    [5, node(5, 2, 2, [-30, 80, 0])],
  ]);
  it('one path per chosen (branch, twig)', () => {
    const paths = buildFlightPaths(
      [
        { depth: 1, candidates: [], chosen: [1, 2] },
        { depth: 2, candidates: [], chosen: [3, 4, 5] },
      ],
      nodes,
    );
    expect(paths).toHaveLength(3);
    expect(paths[0][0]).toEqual([0, 125, 0]);
    expect(paths[0][3]).toEqual([30, 80, 0]);
    expect(paths[2][2]).toEqual([-20, 60, 0]);
  });
  it('compare tour skips unknown paper ids', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const t = table(3);
    const stops = buildCompareTour(
      [
        { paper_id: 'b', score: 0.7 },
        { paper_id: 'ghost', score: 0.95 },
        { paper_id: 'a', score: 0.9 },
      ],
      t,
      new Map([['a', 0], ['b', 2]]),
    );
    expect(stops.map((s) => s.paper_id)).toEqual(['a', 'b']);
    expect(stops[1].position).toEqual([2, 52, 0]);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
  it('compareDwell decreases', () => {
    expect(compareDwell(0, 30)).toBeCloseTo(0.35);
    expect(compareDwell(29, 30)).toBeCloseTo(0.06);
    for (let i = 1; i < 30; i++) expect(compareDwell(i, 30)).toBeLessThan(compareDwell(i - 1, 30));
    expect(compareDwell(0, 1)).toBeCloseTo(0.35);
  });
});

describe('arxiv', () => {
  it('accepts new-style ids with optional version', () => {
    expect(toArxivUrl('2310.00297')).toBe('https://arxiv.org/abs/2310.00297');
    expect(toArxivUrl('2401.1234v2')).toBe('https://arxiv.org/abs/2401.1234v2');
  });
  it('rejects anything else', () => {
    expect(toArxivUrl('hep-th/9901001')).toBeNull();
    expect(toArxivUrl('2313.00297')).toBeNull();
    expect(toArxivUrl('openalex:W123')).toBeNull();
    expect(toArxivUrl('231.00297')).toBeNull();
  });
});

describe('resultCase', () => {
  const g = [{ chunk_id: 'c', paper_id: 'a', title: '', section_title: '', section_type: 'method' as const, text: '', similarity_score: 1, authority_score: 0, final_score: 1, citation_tag: '' }];
  it('grounded / browse / unverified', () => {
    expect(resolveResultCase('a', [{ paper_id: 'a', status: 'verified' }], g)).toBe('grounded');
    expect(resolveResultCase('b', [], g)).toBe('browse');
    expect(resolveResultCase('z', [{ paper_id: 'z', status: 'unverified' }], g)).toBe('unverified');
    expect(resolveResultCase('a', [{ paper_id: 'a', status: 'unverified' }], [])).toBe('unverified');
    expect(resolveResultCase('a', [], [{ chunk_id: 'c1', paper_id: 'a' } as any])).toBe('grounded');
  });
});

describe('storage.ts', () => {
  it('reads, writes, and parses JSON safely', async () => {
    const { readStorage, writeStorage, readJson } = await import('./storage');
    writeStorage('test_key', 'hello');
    expect(readStorage('test_key')).toBe('hello');
    expect(readStorage('nonexistent')).toBeNull();

    writeStorage('json_key', JSON.stringify({ a: 1 }));
    const parsed = readJson('json_key', (v): v is { a: number } => typeof v === 'object' && v !== null && 'a' in v);
    expect(parsed?.a).toBe(1);

    writeStorage('bad_json', '{broken');
    expect(readJson('bad_json', (v): v is any => true)).toBeNull();
  });
});

describe('treeGeometry & cameraPresets edge cases', () => {
  it('calculates rootRadiusAt and rootVertexColor', () => {
    expect(rootRadiusAt(1)).toBeGreaterThan(rootRadiusAt(0));
    expect(rootVertexColor(0, [1, 0, 0], [0, 1, 0]).length).toBe(3);
    expect(rootVertexColor(1, [1, 0, 0], [0, 1, 0]).length).toBe(3);
  });

  it('buildSapParticles returns buffer attributes', () => {
    const parts = buildSapParticles([
      [[0, 0, 0], [10, 20, 30]],
    ], 5);
    expect(parts.count).toBe(5);
    expect(parts.phase.length).toBe(5);
    expect(parts.pathIndex.length).toBe(5);
  });

  it('tubeAlongPath builds geometry buffers', () => {
    const tube = tubeAlongPath(
      [
        [0, 0, 0],
        [0, 10, 0],
        [0, 20, 0],
      ],
      { radius: (t) => 0.5 + t, tubularSegments: 8, radialSegments: 4 },
    );
    expect(tube.getAttribute('position')).toBeDefined();
    expect(tube.getIndex()).toBeDefined();
  });

  it('returns camera presets for all modes', () => {
    expect(getPreset('overview')).toBeDefined();
    expect(getPreset('canopy')).toBeDefined();
    expect(getPreset('ground')).toBeDefined();
    expect(getPreset('focus', { point: [0, 10, 0] })).toBeDefined();
    expect(getPreset('follow', { point: [0, 10, 0] })).toBeDefined();
    expect(FOCUS_DISTANCE).toBeGreaterThan(0);
  });

  it('buildTrunkGeometry creates 3D trunk geometry with attributes', async () => {
    const { buildTrunkGeometry } = await import('./treeGeometry');
    const trunk = buildTrunkGeometry({ height: 20, baseRadius: 3, topRadius: 1.5, color: [0.5, 0.4, 0.3] });
    expect(trunk.getAttribute('position')).toBeDefined();
    expect(trunk.getAttribute('normal')).toBeDefined();
    expect(trunk.getIndex()).toBeDefined();
  });

  it('provides animation config durations', async () => {
    const { animationConfig } = await import('./animationConfig');
    expect(animationConfig.flightSpeed).toBeGreaterThan(0);
    expect(animationConfig.embedding).toBeGreaterThan(0);
  });

  it('executes timed blocks in perfProbe', async () => {
    const { timed, perfStats } = await import('./perfProbe');
    const res = timed('test-metric', () => 42);
    expect(res).toBe(42);
    expect(perfStats).toBeDefined();
  });
});

