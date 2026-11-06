import type { RagRequest, RagStreamEvent } from '../types/rag';
import type { Category, GroundLayout, HealthStatus, PaperDetail, TreeNode, WorldData } from '../types/world';
import { buildChatScript, buildIndex, buildMockPaper, mockPaperDetail, type MockContext } from './mock/mockChat';
import { generateMockWorld } from './mock/mockWorld';
import { parseSseBlock, SseBuffer } from './sseParser';
import { parseVectors } from '../../features/world/api/vectorParser';
import { API_BASE, MOCK_WORLD, PIPELINE_BASE, USE_MOCK } from './config';
import { apiFetch } from './http';

export { API_BASE, MOCK_WORLD, PIPELINE_BASE, USE_MOCK };

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

/** A read from RAG_TS, with the session's token. */
async function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await apiFetch(path, { signal });
  if (!res.ok) throw new HttpError(res.status, `${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

/** A read from the UTH pipeline: another service, so it never sees the session's token. */
async function getPipelineJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${PIPELINE_BASE}${path}`, { signal });
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
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  if (MOCK_WORLD) {
    return getMockContext().world;
  }
  const [categories, ground, tree, buffer, vectorIds] = await Promise.all([
    getPipelineJson<Category[]>('/world/categories', signal),
    getPipelineJson<GroundLayout>('/world/ground', signal),
    getPipelineJson<TreeNode[]>('/world/tree', signal),
    fetch(`${PIPELINE_BASE}/world/vectors.bin`, { signal }).then((r) => {
      if (!r.ok) throw new HttpError(r.status, `/world/vectors.bin → HTTP ${r.status}`);
      return r.arrayBuffer();
    }),
    getPipelineJson<string[]>('/world/vector-ids', signal),
  ]);
  const vectors = parseVectors(buffer);
  if (vectorIds.length !== vectors.count) {
    throw new Error(`vector-ids has ${vectorIds.length} ids but vectors.bin has ${vectors.count} records`);
  }
  return { categories, ground, tree, vectors, vectorIds };
}

const paperCache = new Map<string, Promise<PaperDetail>>();

/** Papers requested in the same moment (a list of result cards) travel in one batch call. */
const PAPER_BATCH_WINDOW_MS = 10;
const PAPER_BATCH_MAX = 20;
interface PendingPaper {
  id: string;
  resolve: (paper: PaperDetail) => void;
  reject: (err: unknown) => void;
}
let pendingPapers: PendingPaper[] = [];

async function fetchPaperBatch(batch: PendingPaper[]): Promise<void> {
  try {
    if (batch.length === 1) {
      batch[0].resolve(await getJson<PaperDetail>(`/papers/${encodeURIComponent(batch[0].id)}`));
      return;
    }
    const ids = batch.map((p) => encodeURIComponent(p.id)).join(',');
    const { items } = await getJson<{ items: PaperDetail[] }>(`/papers?ids=${ids}`);
    const byId = new Map(items.map((p) => [p.paper_id, p]));
    for (const p of batch) {
      const paper = byId.get(p.id);
      if (paper) p.resolve(paper);
      else p.reject(new HttpError(404, `/papers/${p.id} → HTTP 404`));
    }
  } catch (err) {
    for (const p of batch) p.reject(err);
  }
}

function loadPaper(id: string): Promise<PaperDetail> {
  return new Promise((resolve, reject) => {
    if (!pendingPapers.length) {
      setTimeout(() => {
        const queued = pendingPapers;
        pendingPapers = [];
        for (let i = 0; i < queued.length; i += PAPER_BATCH_MAX) {
          void fetchPaperBatch(queued.slice(i, i + PAPER_BATCH_MAX));
        }
      }, PAPER_BATCH_WINDOW_MS);
    }
    pendingPapers.push({ id, resolve, reject });
  });
}

/** Paper metadata + chunks, cached per id (failed requests are not cached). */
export function getPaper(paperId: string): Promise<PaperDetail> {
  const hit = paperCache.get(paperId);
  if (hit) return hit;
  const p = (async () => {
    if (USE_MOCK) {
      await sleep(180 + Math.random() * 220);
      const crawled = (await import('../../features/crawl/crawlClient')).mockCrawledPapers.get(paperId);
      const detail = crawled ? buildMockPaper(paperId, crawled.category_index, crawled.year, false) : mockPaperDetail(getMockContext(), paperId);
      if (!detail) throw new HttpError(404, `Không tìm thấy bài ${paperId}`);
      return detail;
    }
    try {
      return await loadPaper(paperId);
    } catch (err) {
      // Real backend + mock world: hovering a mock vector asks for a mock paper id.
      const mock = MOCK_WORLD && err instanceof HttpError && err.status === 404 ? mockPaperDetail(getMockContext(), paperId) : null;
      if (mock) return mock;
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
    return { mongo: true, qdrant: true, llm: !down, world: true };
  }
  const h = await getJson<{ components?: Partial<HealthStatus> }>('/health');
  const c = h.components ?? {};
  return { mongo: c.mongo === true, qdrant: c.qdrant === true, llm: c.llm === true, world: c.world === true };
}

function isStreamEvent(v: unknown): v is RagStreamEvent {
  return typeof v === 'object' && v !== null && typeof (v as { type?: unknown }).type === 'string';
}

/** POST + ReadableStream SSE reader (EventSource cannot POST). Abort ends quietly. */
export async function* streamChat(req: RagRequest, signal: AbortSignal, idempotencyKey?: string): AsyncGenerator<RagStreamEvent> {
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
    res = await apiFetch('/rag/chat/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
      },
      body: JSON.stringify(req),
      signal,
    });
  } catch (err) {
    if (isAbort(err)) return;
    yield { type: 'error', message: `Không kết nối được backend: ${(err as Error).message}` };
    return;
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
