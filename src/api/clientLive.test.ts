import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encodeVectors } from './vectorParser';

describe('client.ts in live mode (mock fetch)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK', 'false');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('loadWorld fetches categories, ground, tree, vectors, and vectorIds in parallel', async () => {
    const fakeVectors = encodeVectors({
      count: 2,
      positions: new Float32Array(6),
      twigIds: new Uint32Array(2),
      crateIds: new Uint32Array(2),
      categories: new Uint16Array(2),
      years: new Uint16Array(2),
      authority: new Float32Array(2),
      flags: new Uint8Array(2),
    });
    const fakeIds = ['p1', 'p2'];

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/world/categories')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([{ index: 0, code: 'cs.AI', name: 'AI', paper_count: 2 }]) });
      }
      if (url.endsWith('/world/ground')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ tile_size: 10, grid_size: [10, 10], crates: [], roots: [] }) });
      }
      if (url.endsWith('/world/tree')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      }
      if (url.endsWith('/world/vectors.bin')) {
        return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(fakeVectors) });
      }
      if (url.endsWith('/world/vector-ids')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(fakeIds) });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const { loadWorld } = await import('./client');
    const world = await loadWorld();
    expect(world.categories.length).toBe(1);
    expect(world.vectorIds).toEqual(fakeIds);
    expect(world.vectors.count).toBe(2);
  });

  it('loadWorld throws if vectorIds length does not match vectors.bin', async () => {
    const fakeVectors = encodeVectors({
      count: 2,
      positions: new Float32Array(6),
      twigIds: new Uint32Array(2),
      crateIds: new Uint32Array(2),
      categories: new Uint16Array(2),
      years: new Uint16Array(2),
      authority: new Float32Array(2),
      flags: new Uint8Array(2),
    });
    const mismatchedIds = ['p1']; // 1 id

    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/world/categories')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.endsWith('/world/ground')) return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
      if (url.endsWith('/world/tree')) return Promise.resolve({ ok: true, json: () => Promise.resolve([]) });
      if (url.endsWith('/world/vectors.bin')) return Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(fakeVectors) });
      if (url.endsWith('/world/vector-ids')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mismatchedIds) });
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const { loadWorld } = await import('./client');
    await expect(loadWorld()).rejects.toThrow(/vector-ids has 1 ids but vectors.bin has 2 records/);
  });

  it('loadWorld falls back gracefully to procedural mock world if backend endpoints return 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as any;

    const { loadWorld } = await import('./client');
    const world = await loadWorld();
    expect(world).toBeDefined();
    expect(world.categories.length).toBeGreaterThan(0);
    expect(world.vectors.count).toBeGreaterThan(0);
  });

  it('getPaper fetches paper detail from /papers/:id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ paper_id: 'live_paper_1', title: 'Live Paper', chunks: [] }),
    }) as any;

    const { getPaper } = await import('./client');
    const paper = await getPaper('live_paper_1');
    expect(paper.title).toBe('Live Paper');
  });

  it('getPaper falls back to mock detail if /papers/:id returns 404', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
    }) as any;

    const { getPaper, loadWorld } = await import('./client');
    const world = await loadWorld();
    const existingId = world.vectorIds[0];
    const paper = await getPaper(existingId);
    expect(paper.paper_id).toBe(existingId);
    expect(paper.title).toBeDefined();
  });

  it('getHealth fetches from /rag/health and maps component status', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ status: 'ok', components: { vectorStore: 'ready', llm: 'ready' } }),
    }) as any;

    const { getHealth } = await import('./client');
    const health = await getHealth();
    expect(health.lancedb).toBe(true);
    expect(health.llm).toBe(true);
    expect(health.world).toBe(true);
  });

  it('streamChat reads SSE stream from /rag/chat/stream', async () => {
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"type":"phase","phase":"embedding"}\n\n'));
        controller.enqueue(encoder.encode('data: {"type":"delta","delta":"Hello"}\n\n'));
        controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
        controller.close();
      },
    });

    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      body: stream,
    }) as any;

    const { streamChat } = await import('./client');
    const ctrl = new AbortController();
    const events: any[] = [];
    for await (const ev of streamChat({ query: 'test' }, ctrl.signal)) {
      events.push(ev);
    }

    expect(events.length).toBe(3);
    expect(events[0].type).toBe('phase');
    expect(events[1].delta).toBe('Hello');
  });

  it('streamChat falls back to POST /rag/chat when /rag/chat/stream is 404', async () => {
    globalThis.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.endsWith('/rag/chat/stream')) {
        return Promise.resolve({ ok: false, status: 404 });
      }
      if (url.endsWith('/rag/chat')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              query: 'test query',
              answer: 'This is synthesized answer',
              citations: ['2401.0001'],
              grounded_chunks: [{ chunk_id: 'c1', paper_id: '2401.0001', title: 'Paper 1', text: 'Text 1' }],
              latency_ms: 500,
            }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    }) as any;

    const { streamChat } = await import('./client');
    const ctrl = new AbortController();
    const events: any[] = [];
    for await (const ev of streamChat({ query: 'test query' }, ctrl.signal)) {
      events.push(ev);
    }

    expect(events.some((e) => e.type === 'phase' && e.phase === 'embedding')).toBe(true);
    expect(events.some((e) => e.type === 'retrieval')).toBe(true);
    expect(events.some((e) => e.type === 'token')).toBe(true);
    expect(events.some((e) => e.type === 'done')).toBe(true);
  });

  it('streamChat handles HTTP error response gracefully', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ message: 'Internal Server Error' }),
    }) as any;

    const { streamChat } = await import('./client');
    const ctrl = new AbortController();
    const events: any[] = [];
    for await (const ev of streamChat({ query: 'test' }, ctrl.signal)) {
      events.push(ev);
    }

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('error');
    expect(events[0].message).toBe('Internal Server Error');
  });

  it('streamChat handles network failure gracefully', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('Network offline')) as any;

    const { streamChat } = await import('./client');
    const ctrl = new AbortController();
    const events: any[] = [];
    for await (const ev of streamChat({ query: 'test' }, ctrl.signal)) {
      events.push(ev);
    }

    expect(events.length).toBe(1);
    expect(events[0].type).toBe('error');
    expect(events[0].message).toContain('Không kết nối được backend');
  });
});
