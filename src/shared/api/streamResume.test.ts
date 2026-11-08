import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { RagStreamEvent } from '../types/rag';

const sse = (events: object[]) => events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join('');

/** A body that sends `text`, then fails like Chrome's `TypeError: network error` (or ends). */
function body(text: string, fail: boolean): ReadableStream<Uint8Array> {
  return new ReadableStream({
    start(c) {
      c.enqueue(new TextEncoder().encode(text));
      if (fail) c.error(new TypeError('network error'));
      else c.close();
    },
  });
}

const ok = (text: string, fail = false) =>
  ({ ok: true, status: 200, headers: new Headers(), body: body(text, fail) }) as unknown as Response;
const busy = (status: number, message: string) =>
  ({ ok: false, status, headers: new Headers(), body: null, json: () => Promise.resolve({ message }) }) as unknown as Response;

const DONE = { type: 'done', citations: ['p1'], timings: {}, session_id: 's1', message_id: 'm1' };

async function collect(signedIn: boolean, fetchMock: ReturnType<typeof vi.fn>) {
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  const state = { accessToken: signedIn ? 'a1' : null, rotateTokens: () => Promise.resolve(false) };
  vi.doMock('../../features/auth/authStore', () => ({ useAuth: { getState: () => state } }));
  const { streamChat } = await import('./client');
  const out: RagStreamEvent[] = [];
  const run = (async () => {
    for await (const ev of streamChat({ query: 'q' }, new AbortController().signal, 'key-1')) out.push(ev);
  })();
  for (let i = 0; i < 20; i++) await vi.advanceTimersByTimeAsync(3_000);
  await run;
  return out;
}

describe('streamChat resumes a lost stream through Idempotency-Key', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv('VITE_USE_MOCK', 'false');
    vi.stubEnv('VITE_MOCK_WORLD', 'false');
    vi.useFakeTimers();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.doUnmock('../../features/auth/authStore');
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('drops before the first token, waits out 409, then gets the stored answer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(sse([{ type: 'phase', phase: 'embedding' }, { type: 'phase', phase: 'found' }]), true))
      .mockResolvedValueOnce(busy(409, 'request already in progress'))
      .mockResolvedValueOnce(busy(429, 'too many in-flight requests'))
      .mockResolvedValueOnce(ok(sse([{ type: 'phase', phase: 'generating' }, { type: 'token', text: 'Full answer' }, DONE])));
    const out = await collect(true, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(4);
    for (const [, init] of fetchMock.mock.calls) {
      expect((init as RequestInit).headers).toMatchObject({ 'Idempotency-Key': 'key-1' });
    }
    expect(out.some((e) => e.type === 'error')).toBe(false);
    expect(out.at(-1)).toMatchObject({ type: 'done', session_id: 's1' });
  });

  it('clears the partial answer before the replayed one, so text is not doubled', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(sse([{ type: 'token', text: 'Full ' }]), true))
      .mockResolvedValueOnce(ok(sse([{ type: 'token', text: 'Full answer' }, DONE])));
    const out = await collect(true, fetchMock);

    let answer = '';
    for (const e of out) {
      if (e.type === 'token') answer += e.text;
      if (e.type === 'answer_replaced') answer = e.answer;
    }
    expect(answer).toBe('Full answer');
  });

  it('does not repeat an anonymous request (no stored answer to replay)', async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(ok(sse([{ type: 'phase', phase: 'embedding' }]), true));
    const out = await collect(false, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(out.at(-1)).toMatchObject({ type: 'error', message: 'Mất kết nối stream: network error' });
  });

  it('a 409 for a reused key is not retried', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(sse([{ type: 'phase', phase: 'embedding' }]), true))
      .mockResolvedValueOnce(busy(409, 'idempotency key reused with a different request'));
    const out = await collect(true, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.at(-1)).toMatchObject({ type: 'error', message: 'Mất kết nối stream: network error' });
  });
  it('an AbortError the app did not ask for is a lost stream, not a quiet cancel', async () => {
    const aborted = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(new TextEncoder().encode(sse([{ type: 'phase', phase: 'found' }])));
        c.error(new DOMException('BodyStreamBuffer was aborted', 'AbortError'));
      },
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, status: 200, headers: new Headers(), body: aborted })
      .mockResolvedValueOnce(ok(sse([{ type: 'token', text: 'Full answer' }, DONE])));
    const out = await collect(true, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.at(-1)).toMatchObject({ type: 'done', session_id: 's1' });
  });

  it('a response closed cleanly before done is resumed too', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(ok(sse([{ type: 'phase', phase: 'found' }])))
      .mockResolvedValueOnce(ok(sse([{ type: 'token', text: 'Full answer' }, DONE])));
    const out = await collect(true, fetchMock);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(out.at(-1)).toMatchObject({ type: 'done', session_id: 's1' });
  });

  it('aborting the signal still ends quietly, without a retry', async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new DOMException('Aborted', 'AbortError')) as unknown as typeof fetch;
    vi.doMock('../../features/auth/authStore', () => ({ useAuth: { getState: () => ({ accessToken: 'a1' }) } }));
    const { streamChat } = await import('./client');
    const ctrl = new AbortController();
    ctrl.abort();
    const out: RagStreamEvent[] = [];
    for await (const ev of streamChat({ query: 'q' }, ctrl.signal, 'key-1')) out.push(ev);

    expect(out).toEqual([]);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });
});
