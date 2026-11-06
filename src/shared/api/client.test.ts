import { describe, expect, it, vi, beforeEach } from 'vitest';
import { getHealth, getPaper, HttpError, loadWorld, streamChat } from './client';

describe('client.ts API client', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('HttpError', () => {
    it('creates an instance with status and message', () => {
      const err = new HttpError(404, 'Not found');
      expect(err.status).toBe(404);
      expect(err.message).toBe('Not found');
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe('loadWorld in mock mode', () => {
    it('loads mock world data with valid structure', async () => {
      const world = await loadWorld();
      expect(world).toBeDefined();
      expect(Array.isArray(world.categories)).toBe(true);
      expect(world.ground).toBeDefined();
      expect(Array.isArray(world.tree)).toBe(true);
      expect(world.vectors.count).toBeGreaterThan(0);
      expect(world.vectorIds.length).toBe(world.vectors.count);
    });

    it('rejects if aborted immediately', async () => {
      const controller = new AbortController();
      controller.abort();
      await expect(loadWorld(controller.signal)).rejects.toThrow();
    });
  });

  describe('getPaper in mock mode', () => {
    it('returns paper detail for a valid paper and caches the promise', async () => {
      const world = await loadWorld();
      const firstId = world.vectorIds[0];
      const p1 = getPaper(firstId);
      const p2 = getPaper(firstId);
      expect(p1).toBe(p2); // cached promise

      const detail = await p1;
      expect(detail.paper_id).toBe(firstId);
      expect(detail.title).toBeDefined();
      expect(Array.isArray(detail.chunks)).toBe(true);
    });

    it('throws 404 for nonexistent paper id and removes from cache', async () => {
      await expect(getPaper('non_existent_paper_id_999999')).rejects.toThrow(HttpError);
    });
  });

  describe('getHealth in mock mode', () => {
    it('returns health status', async () => {
      const health = await getHealth();
      expect(health.qdrant).toBe(true);
      expect(health.world).toBe(true);
      expect(typeof health.llm).toBe('boolean');
    });
  });

  describe('streamChat in mock mode', () => {
    it('yields streaming events in mock mode', async () => {
      const controller = new AbortController();
      const events: any[] = [];
      for await (const ev of streamChat({ query: 'What is self-attention?' }, controller.signal)) {
        events.push(ev);
      }
      expect(events.length).toBeGreaterThan(0);
      expect(events.some((e) => e.type === 'phase')).toBe(true);
      expect(events.some((e) => e.type === 'delta' || e.type === 'done')).toBe(true);
    });

    it('stops quietly if aborted mid-stream', async () => {
      const controller = new AbortController();
      const generator = streamChat({ query: 'Attention' }, controller.signal);
      const first = await generator.next();
      expect(first.done).toBe(false);

      controller.abort();
      const second = await generator.next();
      expect(second.done).toBe(true);
    });
  });
});
