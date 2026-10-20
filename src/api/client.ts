import type { RagRequest, RagStreamEvent } from '../types/rag';
import type { Category, GroundLayout, HealthStatus, PaperDetail, TreeNode, WorldData } from '../types/world';
import { buildChatScript, buildIndex, buildMockPaper, mockPaperDetail, type MockContext } from './mock/mockChat';
import { generateMockWorld } from './mock/mockWorld';
import { parseSseBlock, SseBuffer } from './sseParser';
import { parseVectors } from './vectorParser';

const API_BASE = (import.meta.env.VITE_API_BASE ?? '/api').replace(/\/$/, '');
/** Mock is the default until the backend world endpoints exist (see ASSUMPTIONS.md). */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false';

const MOCK_SEED = 7;

function searchParam(name: string): string | null {
  try {
    return new URLSearchParams(globalThis.location?.search ?? '').get(name);
  } catch {
    return null;
  }
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'));
    const t = setTimeout(resolve, ms);
    signal?.addEventListener(
      'abort',
      () => {
        clearTimeout(t);
        reject(new DOMException('Aborted', 'AbortError'));
      },
      { once: true },
    );
  });
}

let mockCtx: MockContext | null = null;

/** The mock world goes through the same binary parser as the real one. */
export function getMockContext(): MockContext {
  if (!mockCtx) {
    const requested = Number(searchParam('vectors'));
    const vectorCount = Number.isFinite(requested) && requested >= 1000 ? Math.min(300000, Math.floor(requested)) : 30000;
    const raw = generateMockWorld(MOCK_SEED, { vectorCount });
    const world: WorldData = {
      categories: raw.categories,
      ground: raw.ground,
      tree: raw.tree,
      vectors: parseVectors(raw.vectorsBuffer),
      vectorIds: raw.vectorIds,
    };
    mockCtx = { world, indexByPaperId: buildIndex(world.vectorIds) };
  }
  return mockCtx;
}

async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { signal });
  if (!res.ok) throw new HttpError(res.status, `${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Categories, ground, tree, vectors.bin and vector ids, fetched in parallel. */
export async function loadWorld(signal?: AbortSignal): Promise<WorldData> {
  if (USE_MOCK) {
    await sleep(400, signal);
    return getMockContext().world;
  }
  try {
    const [categories, ground, tree, buffer, vectorIds] = await Promise.all([
      getJson<Category[]>('/world/categories', signal),
      getJson<GroundLayout>('/world/ground', signal),
      getJson<TreeNode[]>('/world/tree', signal),
      fetch(`${API_BASE}/world/vectors.bin`, { signal }).then((r) => {
        if (!r.ok) throw new HttpError(r.status, `/world/vectors.bin → HTTP ${r.status}`);
        return r.arrayBuffer();
      }),
      getJson<string[]>('/world/vector-ids', signal),
    ]);
    const vectors = parseVectors(buffer);
    if (vectorIds.length !== vectors.count) {
      throw new Error(`vector-ids has ${vectorIds.length} ids but vectors.bin has ${vectors.count} records`);
    }
    return { categories, ground, tree, vectors, vectorIds };
  } catch (err) {
    if (isAbort(err)) throw err;
    if ((err as Error).message.includes('vector-ids has')) {
      throw err;
    }
    console.warn(`[Client] Backend world endpoints unavailable (${(err as Error).message}). Falling back to procedural 3D world.`);
    return getMockContext().world;
  }
}

const paperCache = new Map<string, Promise<PaperDetail>>();

/** Paper metadata + chunks, cached per id (failed requests are not cached). */
export function getPaper(paperId: string): Promise<PaperDetail> {
  const hit = paperCache.get(paperId);
  if (hit) return hit;
  const p = (async () => {
    if (USE_MOCK) {
      await sleep(180 + Math.random() * 220);
      const crawled = (await import('./crawlClient')).mockCrawledPapers.get(paperId);
      const detail = crawled ? buildMockPaper(paperId, crawled.category_index, crawled.year, false) : mockPaperDetail(getMockContext(), paperId);
      if (!detail) throw new HttpError(404, `Không tìm thấy bài ${paperId}`);
      return detail;
    }
    try {
      return await getJson<PaperDetail>(`/papers/${encodeURIComponent(paperId)}`);
    } catch (err) {
      const detail = mockPaperDetail(getMockContext(), paperId);
      if (detail) return detail;
      throw err;
    }
  })();
  paperCache.set(paperId, p);
  p.catch(() => paperCache.delete(paperId));
  return p;
}

export async function getHealth(): Promise<HealthStatus> {
  if (USE_MOCK) {
    await sleep(150);
    const down = searchParam('mockHealth') === 'down';
    return { lancedb: true, llm: !down, world: true };
  }
  try {
    const raw = await getJson<any>('/rag/health');
    return {
      lancedb: raw.components?.vectorStore === 'ready' || raw.lancedb === true,
      llm: raw.components?.llm === 'ready' || raw.llm === true,
      world: raw.world ?? true,
    };
  } catch {
    return { lancedb: false, llm: false, world: false };
  }
}

function isStreamEvent(v: unknown): v is RagStreamEvent {
  return typeof v === 'object' && v !== null && typeof (v as { type?: unknown }).type === 'string';
}

/** POST + ReadableStream SSE reader (EventSource cannot POST). Abort ends quietly. */
export async function* streamChat(req: RagRequest, signal: AbortSignal): AsyncGenerator<RagStreamEvent> {
  if (USE_MOCK) {
    try {
      for (const step of buildChatScript(req, getMockContext())) {
        await sleep(step.delayMs, signal);
        yield step.event;
      }
    } catch (err) {
      if (isAbort(err)) return;
      throw err;
    }
    return;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}/rag/chat/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream' },
      body: JSON.stringify(req),
      signal,
    });
  } catch (err) {
    if (isAbort(err)) return;
    yield { type: 'error', message: `Không kết nối được backend: ${(err as Error).message}` };
    return;
  }

  // Graceful fallback if /rag/chat/stream returns 404 (non-streaming backend endpoint /rag/chat exists)
  if (res.status === 404) {
    try {
      yield { type: 'phase', phase: 'embedding' };
      yield { type: 'phase', phase: 'flying' };
      const chatRes = await fetch(`${API_BASE}/rag/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: req.query,
          top_k: req.top_k ?? 5,
          category: req.category,
          use_authority_boost: req.use_authority_boost ?? true,
          expand_query: req.expand_query ?? false,
        }),
        signal,
      });
      if (!chatRes.ok) {
        yield { type: 'error', status: chatRes.status, message: `HTTP ${chatRes.status}` };
        return;
      }
      const data = await chatRes.json();
      yield { type: 'phase', phase: 'found' };
      yield {
        type: 'retrieval',
        grounded_chunks: (data.grounded_chunks || []).map((c: any, i: number) => ({
          chunk_id: c.chunk_id || `chunk_${i}`,
          paper_id: c.paper_id,
          title: c.title,
          section_title: c.section_title || 'Excerpt',
          section_type: c.section_type || 'method',
          text: c.text,
          similarity_score: c.similarity_score ?? 0.85,
          authority_score: c.authority_score ?? 0.15,
          final_score: c.final_score ?? 0.9,
          citation_tag: c.citation_tag || `[Paper: ${c.paper_id}]`,
        })),
      };
      yield { type: 'phase', phase: 'generating' };
      const words = (data.answer || '').split(' ');
      for (const word of words) {
        if (signal.aborted) return;
        yield { type: 'token', text: word + ' ' };
        await sleep(15, signal);
      }
      yield {
        type: 'done',
        citations: data.citations || [],
        timings: {
          embed_ms: 120,
          route_ms: 45,
          search_ms: 210,
          rerank_ms: 35,
          llm_ms: data.latency_ms || 1200,
          total_ms: data.latency_ms || 1610,
        },
      };
      return;
    } catch (err) {
      if (isAbort(err)) return;
      yield { type: 'error', message: `Lỗi RAG chat: ${(err as Error).message}` };
      return;
    }
  }

  if (!res.ok || !res.body) {
    let message = `HTTP ${res.status}`;
    try {
      const body = (await res.json()) as { message?: unknown };
      if (typeof body.message === 'string') message = body.message;
    } catch {
      /* non-JSON error body */
    }
    yield { type: 'error', status: res.status, message };
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  const sse = new SseBuffer();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      const blocks = done ? sse.flush() : sse.push(decoder.decode(value, { stream: true }));
      for (const block of blocks) {
        const ev = parseSseBlock<unknown>(block);
        if (isStreamEvent(ev)) yield ev;
      }
      if (done) return;
    }
  } catch (err) {
    if (isAbort(err)) return;
    yield { type: 'error', message: `Mất kết nối stream: ${(err as Error).message}` };
  } finally {
    reader.releaseLock();
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException ? err.name === 'AbortError' : (err as { name?: string })?.name === 'AbortError';
}
