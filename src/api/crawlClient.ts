import type { CrawlConnection, CrawlStreamEvent, CrawlVectorItem } from '../types/crawl';
import { getMockContext, MOCK_WORLD, PIPELINE_BASE } from './client';
import { MockCrawler, mockCrawlStream, type MockCrawlControl } from './mock/mockCrawl';
import { parseSseBlock, SseBuffer } from './sseParser';


/** Reconnect delay after `attempt` consecutive failures: 1 s, 2 s, 4 s … capped at 30 s. */
export function backoffDelay(attempt: number): number {
  return Math.min(30_000, 1000 * 2 ** Math.max(0, attempt));
}

/** Knobs of the mock crawler, toggled from the HUD dev toolbar. */
export const mockCrawlControl: MockCrawlControl = { running: false, ratePerMin: 300, offline: false };

let mockCrawler: MockCrawler | null = null;
/** Papers created by the mock crawler, so `getPaper` can describe them. */
export const mockCrawledPapers = new Map<string, CrawlVectorItem>();

function getMockCrawler(): MockCrawler {
  mockCrawler ??= new MockCrawler(getMockContext());
  return mockCrawler;
}

function isCrawlEvent(v: unknown): v is CrawlStreamEvent {
  return typeof v === 'object' && v !== null && typeof (v as { type?: unknown }).type === 'string';
}

/** One connection's worth of events; ends normally when the server closes, throws on failure. */
export type CrawlSource = (signal: AbortSignal) => AsyncIterable<CrawlStreamEvent>;

/** Pipeline: `GET <PIPELINE_BASE>/crawl/stream` (SSE) read with fetch + SseBuffer. */
export function httpCrawlSource(fetchImpl: typeof fetch = fetch, url = `${PIPELINE_BASE}/crawl/stream`): CrawlSource {
  return async function* (signal) {
    const res = await fetchImpl(url, { headers: { Accept: 'text/event-stream' }, signal });
    if (!res.ok || !res.body) throw new Error(`crawl stream HTTP ${res.status}`);
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    const sse = new SseBuffer();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        const blocks = done ? sse.flush() : sse.push(decoder.decode(value, { stream: true }));
        for (const b of blocks) {
          const ev = parseSseBlock<unknown>(b);
          if (isCrawlEvent(ev)) yield ev;
        }
        if (done) return;
      }
    } finally {
      reader.releaseLock();
    }
  };
}

function mockCrawlSource(): CrawlSource {
  return async function* (signal) {
    for await (const ev of mockCrawlStream(getMockCrawler(), mockCrawlControl, signal)) {
      if (ev.type === 'crawl_vectors') for (const it of ev.items) mockCrawledPapers.set(it.paper_id, it);
      yield ev;
    }
  };
}

export interface StreamCrawlOptions {
  onConnection?: (state: CrawlConnection) => void;
  source?: CrawlSource;
  sleep?: (ms: number, signal: AbortSignal) => Promise<void>;
}

function abortableSleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const t = setTimeout(resolve, ms);
    signal.addEventListener('abort', () => (clearTimeout(t), resolve()), { once: true });
  });
}

/**
 * Crawl events forever, reconnecting with exponential backoff (1 s → 2 s → 4 s … ≤ 30 s) whenever
 * the stream fails or closes. The attempt counter resets once a connection delivers an event.
 * Aborting the signal ends the generator for good — no further reconnects.
 */
export async function* streamCrawl(signal: AbortSignal, opts: StreamCrawlOptions = {}): AsyncGenerator<CrawlStreamEvent> {
  const source = opts.source ?? (MOCK_WORLD ? mockCrawlSource() : httpCrawlSource());
  const sleep = opts.sleep ?? abortableSleep;
  let attempt = 0;
  while (!signal.aborted) {
    try {
      let first = true;
      for await (const ev of source(signal)) {
        if (signal.aborted) return;
        if (first) {
          first = false;
          attempt = 0;
          opts.onConnection?.('connected');
        }
        yield ev;
      }
    } catch (err) {
      if (signal.aborted || (err as { name?: string })?.name === 'AbortError') return;
    }
    if (signal.aborted) return;
    opts.onConnection?.('reconnecting');
    await sleep(backoffDelay(attempt++), signal);
  }
}
