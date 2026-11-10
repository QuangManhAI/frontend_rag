import type { RagRequest, RagStreamEvent } from '../types/rag';
import type { Category, GroundLayout, HealthStatus, PaperDetail, TreeNode, WorldData } from '../types/world';
import { buildChatScript, buildIndex, buildMockPaper, mockPaperDetail, type MockContext } from './mock/mockChat';
import { generateMockWorld } from './mock/mockWorld';
import { parseSseBlock, SseBuffer } from './sseParser';
import { parseVectors } from '../../features/world/api/vectorParser';
import { API_BASE, MOCK_WORLD, PIPELINE_BASE, USE_MOCK } from './config';
import { apiFetch } from './http';
import { useAuth } from '../../features/auth/authStore';

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

/** POST + ReadableStream SSE reader (EventSource cannot POST). Aborting `signal` ends quietly. */
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

  // Signed in + Idempotency-Key: the backend keeps generating when the connection drops and stores
  // the answer under that key, so a lost stream is resumed by repeating the same POST (it answers
  // 409 while the first run is still going, then replays the stored answer). Anonymous requests have
  // no stored answer: repeating them would run the whole pipeline again.
  const resumable = Boolean(idempotencyKey) && Boolean(useAuth.getState().accessToken);
  const deadline = Date.now() + RESUME_WINDOW_MS;
  let streamedText = '';
  let resuming = false;
  let lost = '';

  for (;;) {
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
      // Only our own signal means "cancelled": the browser can raise an AbortError on its own.
      if (signal.aborted) return;
      if (resuming && Date.now() < deadline) {
        if (!(await pause(RESUME_DELAY_MS, signal))) return;
        continue;
      }
      yield* giveUp(resuming ? lost : `Không kết nối được backend: ${(err as Error).message}`, streamedText);
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
      // 409: the first run still holds the key. 429: it still holds this user's in-flight slot.
      const busy = res.status === 429 || (res.status === 409 && message === REQUEST_IN_PROGRESS);
      if (resuming && busy && Date.now() < deadline) {
        const retryAfter = Number(res.headers.get('Retry-After')) * 1000;
        if (!(await pause(Math.max(RESUME_DELAY_MS, retryAfter || 0), signal))) return;
        continue;
      }
      if (resuming) {
        yield* giveUp(lost, streamedText);
        return;
      }
      yield { type: 'error', status: res.status, message };
      return;
    }

    // A resumed stream starts the answer over: drop what the lost one had shown.
    let restartAnswer = resuming && streamedText.length > 0;
    try {
      for await (const ev of readSse(res.body)) {
        if (!isStreamEvent(ev)) continue;
        if (ev.type === 'token' || ev.type === 'answer_replaced') {
          if (restartAnswer) {
            restartAnswer = false;
            streamedText = '';
            yield { type: 'answer_replaced', answer: '' };
          }
          if (ev.type === 'token' && typeof ev.text === 'string') streamedText += ev.text;
          else if (ev.type === 'answer_replaced' && typeof ev.answer === 'string') streamedText = ev.answer;
        }
        yield ev;
        if (ev.type === 'done' || ev.type === 'error') return;
      }
      // A proxy can close the response cleanly when its upstream drops: that is a lost stream too.
      throw new Error('stream closed before done');
    } catch (err) {
      if (signal.aborted) return;
      lost = `Mất kết nối stream: ${(err as Error).message}`;
      if (resumable && Date.now() < deadline) {
        console.warn(`[stream] ${lost}: resuming with the same Idempotency-Key`);
        resuming = true;
        if (!(await pause(RESUME_DELAY_MS, signal))) return;
        continue;
      }
      yield* giveUp(lost, streamedText);
      return;
    }
  }
}

/** How long a lost stream is retried: the LLM queue can hold a turn for a few minutes. */
export const RESUME_WINDOW_MS = 180_000;
export const RESUME_DELAY_MS = 3_000;
const REQUEST_IN_PROGRESS = 'request already in progress';

/** Keeps a partly streamed answer (closed with a local `done`), or reports the error. */
function* giveUp(message: string, streamedText: string): Generator<RagStreamEvent> {
  if (streamedText.trim().length === 0) {
    yield { type: 'error', message };
    return;
  }
  const citations = Array.from(
    new Set(Array.from(streamedText.matchAll(/\[Paper:\s*([^\]]+)\]/g), (m) => m[1].trim())),
  );
  yield {
    type: 'done',
    citations,
    timings: { embed_ms: 0, route_ms: 0, search_ms: 0, rerank_ms: 0, llm_ms: 0, total_ms: 0 },
    session_id: null,
    message_id: null,
  };
}

/** Parsed SSE `data:` payloads of one response body; throws when the connection drops. */
async function* readSse(body: ReadableStream<Uint8Array>): AsyncGenerator<unknown> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  const sse = new SseBuffer();
  try {
    for (;;) {
      const { done, value } = await reader.read();
      const blocks = done ? sse.flush() : sse.push(decoder.decode(value, { stream: true }));
      for (const block of blocks) yield parseSseBlock<unknown>(block);
      if (done) return;
    }
  } finally {
    reader.releaseLock();
  }
}

/** Waits `ms`; false when the signal aborts first. */
async function pause(ms: number, signal: AbortSignal): Promise<boolean> {
  try {
    await sleep(ms, signal);
    return true;
  } catch {
    return false;
  }
}

function isAbort(err: unknown): boolean {
  return err instanceof DOMException ? err.name === 'AbortError' : (err as { name?: string })?.name === 'AbortError';
}
