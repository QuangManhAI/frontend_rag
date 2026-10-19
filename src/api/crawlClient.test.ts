import { describe, expect, it } from 'vitest';
import type { CrawlConnection, CrawlStreamEvent } from '../types/crawl';
import { backoffDelay, httpCrawlSource, streamCrawl, type CrawlSource } from './crawlClient';

const status = (fetched: number): CrawlStreamEvent => ({ type: 'crawl_status', running: true, target: 10, fetched, embedded: 0, rate_per_min: 300, started_at: '' });

describe('backoffDelay', () => {
  it('1 s → 2 s → 4 s … capped at 30 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6, 10].map(backoffDelay)).toEqual([1000, 2000, 4000, 8000, 16000, 30000, 30000, 30000]);
  });
});

describe('streamCrawl', () => {
  it('reconnects with growing delays and resets after a successful connection', async () => {
    const ctrl = new AbortController();
    const delays: number[] = [];
    const states: CrawlConnection[] = [];
    let call = 0;
    // Fails twice, then delivers one event and drops, then fails until aborted.
    const source: CrawlSource = async function* () {
      call++;
      if (call === 3) {
        yield status(1);
        return;
      }
      throw new Error('down');
    };
    const sleep = async (ms: number) => {
      delays.push(ms);
      if (delays.length >= 5) ctrl.abort();
    };
    const got: CrawlStreamEvent[] = [];
    for await (const ev of streamCrawl(ctrl.signal, { source, sleep, onConnection: (s) => states.push(s) })) got.push(ev);
    expect(got).toHaveLength(1);
    expect(delays).toEqual([1000, 2000, 1000, 2000, 4000]);
    expect(states).toContain('connected');
    expect(states.filter((s) => s === 'reconnecting')).toHaveLength(5);
  });

  it('abort stops for good — no further connection attempts', async () => {
    const ctrl = new AbortController();
    let calls = 0;
    const source: CrawlSource = async function* (signal) {
      calls++;
      yield status(1);
      // Like fetch: an already-aborted signal rejects at once, otherwise when it aborts.
      if (!signal.aborted) await new Promise<void>((r) => signal.addEventListener('abort', () => r(), { once: true }));
      throw Object.assign(new Error('aborted'), { name: 'AbortError' });
    };
    let slept = 0;
    const it = streamCrawl(ctrl.signal, { source, sleep: async () => void slept++ });
    const first = await it.next();
    expect(first.done).toBe(false);
    ctrl.abort();
    const rest = await it.next();
    expect(rest.done).toBe(true);
    expect(calls).toBe(1);
    expect(slept).toBe(0);
  });

  it('HTTP errors count as a failed connection', async () => {
    const ctrl = new AbortController();
    const fetchImpl = (async () => new Response('nope', { status: 503 })) as typeof fetch;
    const delays: number[] = [];
    const run = streamCrawl(ctrl.signal, {
      source: httpCrawlSource(fetchImpl, '/api/crawl/stream'),
      sleep: async (ms) => {
        delays.push(ms);
        if (delays.length === 3) ctrl.abort();
      },
    });
    for await (const _ of run) {
      /* no events */
    }
    expect(delays).toEqual([1000, 2000, 4000]);
  });

  it('parses SSE from the HTTP source', async () => {
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        const enc = new TextEncoder();
        c.enqueue(enc.encode(': ping\n\ndata: {"type":"crawl_batch","stage":"fetched","crate_id":3,"category_index":1,"co'));
        c.enqueue(enc.encode('unt":4}\n\n'));
        c.close();
      },
    });
    const fetchImpl = (async () => new Response(body, { status: 200 })) as typeof fetch;
    const ctrl = new AbortController();
    const out: CrawlStreamEvent[] = [];
    for await (const ev of httpCrawlSource(fetchImpl)(ctrl.signal)) out.push(ev);
    expect(out).toEqual([{ type: 'crawl_batch', stage: 'fetched', crate_id: 3, category_index: 1, count: 4 }]);
  });
});
