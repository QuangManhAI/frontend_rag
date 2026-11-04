import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { encodeVectors } from './vectorParser';

describe('client.ts in live mode (mock fetch)', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK', 'false');
    vi.stubEnv('VITE_MOCK_WORLD', 'false');
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

  it('getPaper fetches paper detail from /papers/:id', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ paper_id: 'live_paper_1', title: 'Live Paper', chunks: [] }),
    }) as any;

    const { getPaper } = await import('./client');
    const paper = await getPaper('live_paper_1');
    expect(paper.title).toBe('Live Paper');
  });

  it('getHealth reads components from /api/v1/health', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({ status: 'degraded', components: { mongo: true, qdrant: true, llm: false, world: false } }),
    });
    globalThis.fetch = fetchMock as any;

    const { getHealth } = await import('./client');
    const health = await getHealth();
    expect(fetchMock.mock.calls[0][0]).toBe('/api/v1/health');
    expect(health).toEqual({ mongo: true, qdrant: true, llm: false, world: false });
  });

  it('world endpoints go to the pipeline base', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    globalThis.fetch = fetchMock as any;
    const { loadWorld } = await import('./client');
    await expect(loadWorld()).rejects.toThrow();
    expect(fetchMock.mock.calls.map((c) => String(c[0]))).toContain('/pipeline/world/categories');
  });

  it('getPaper falls back to the mock world when the real backend 404s a mock id', async () => {
    vi.stubEnv('VITE_MOCK_WORLD', 'true');
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 404 }) as any;
    const { getPaper, getMockContext } = await import('./client');
    const mockId = getMockContext().world.vectorIds[0];
    const paper = await getPaper(mockId);
    expect(paper.paper_id).toBe(mockId);
    await expect(getPaper('2106.09685')).rejects.toThrow(/404/);
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

describe('API contract of the live client', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK', 'false');
    vi.stubEnv('VITE_MOCK_WORLD', 'false');
    const memory = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => memory.set(k, v),
      removeItem: (k: string) => memory.delete(k),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  const paper = (id: string) => ({ paper_id: id, title: id });
  const json = (body: unknown, status = 200) => ({ ok: status < 400, status, json: () => Promise.resolve(body) });

  it('papers requested together travel in one batch; unknown ones reject with 404', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ items: [paper('a'), paper('b')], not_found: ['c'] }));
    globalThis.fetch = fetchMock as any;
    const { getPaper } = await import('./client');
    const [a, b, c] = await Promise.allSettled([getPaper('a'), getPaper('b'), getPaper('c')]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/v1/papers?ids=a,b,c');
    expect(a.status).toBe('fulfilled');
    expect(b.status).toBe('fulfilled');
    expect(c.status).toBe('rejected');
  });

  it('a single paper uses the single-resource route', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(paper('openalex:W1')));
    globalThis.fetch = fetchMock as any;
    const { getPaper } = await import('./client');
    await getPaper('openalex:W1');
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/v1/papers/openalex%3AW1');
  });

  it('streamChat sends the Idempotency-Key header', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json({ message: 'nope' }, 500));
    globalThis.fetch = fetchMock as any;
    const { streamChat } = await import('./client');
    for await (const _ of streamChat({ query: 'q' }, new AbortController().signal, 'key-1')) {
      /* drain */
    }
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).toBe('key-1');
  });

  it('fetchAllPages follows next_cursor to the end', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json({ items: [1, 2], next_cursor: 'c1', has_more: true }))
      .mockResolvedValueOnce(json({ items: [3], next_cursor: null, has_more: false }));
    globalThis.fetch = fetchMock as any;
    const { fetchAllPages } = await import('./http');
    expect(await fetchAllPages('/chat-sessions', { limit: '50' }, 10)).toEqual([1, 2, 3]);
    expect(String(fetchMock.mock.calls[0][0])).toBe('/api/v1/chat-sessions?limit=50');
    expect(String(fetchMock.mock.calls[1][0])).toBe('/api/v1/chat-sessions?limit=50&cursor=c1');
  });

  it('a 401 rotates the tokens once, for concurrent calls too, and repeats the requests', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
      if (url.endsWith('/auth/token-rotations')) {
        return Promise.resolve(json({ user: { id: 'u' }, access_token: 'new', refresh_token: 'r2' }, 201));
      }
      const auth = (init?.headers as Record<string, string>)?.Authorization;
      return Promise.resolve(auth === 'Bearer new' ? json({ fine: true }) : json({}, 401));
    });
    globalThis.fetch = fetchMock as any;
    const { useAuth } = await import('../store/authStore');
    const { apiFetch } = await import('./http');
    useAuth.setState({ accessToken: 'old', refreshToken: 'r1', isAuthenticated: true });
    const [one, two] = await Promise.all([apiFetch('/users/me'), apiFetch('/chat-sessions')]);
    expect(one.status).toBe(200);
    expect(two.status).toBe(200);
    const rotations = fetchMock.mock.calls.filter((c) => String(c[0]).endsWith('/auth/token-rotations'));
    expect(rotations).toHaveLength(1);
    expect(useAuth.getState().refreshToken).toBe('r2');
  });

  it('a refused refresh token ends the session and returns the 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue(json({}, 401)) as any;
    const { useAuth } = await import('../store/authStore');
    const { apiFetch } = await import('./http');
    useAuth.setState({ accessToken: 'old', refreshToken: 'r1', isAuthenticated: true });
    expect((await apiFetch('/users/me')).status).toBe(401);
    expect(useAuth.getState().isAuthenticated).toBe(false);
  });
});
