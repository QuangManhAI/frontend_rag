import { describe, expect, it, vi } from 'vitest';
import type { GroundedChunk } from '../types/rag';
import { advanceVisual, checkCitations, emptyRun, isValidTransition, reduceEvent, type PipelineState } from './pipeline';

const chunk = (paper_id: string): GroundedChunk => ({
  chunk_id: `${paper_id}::c1`, paper_id, title: 't', section_title: 's', section_type: 'method', text: 'x',
  similarity_score: 0.8, authority_score: 0.1, final_score: 0.66, citation_tag: `[Paper: ${paper_id}]`,
});
const start = (): PipelineState => ({ phase: 'idle', current: emptyRun('q') });

describe('pipeline', () => {
  it('accepts forward transitions and error from anywhere', () => {
    expect(isValidTransition('idle', 'embedding')).toBe(true);
    expect(isValidTransition('embedding', 'comparing')).toBe(true);
    expect(isValidTransition('found', 'error')).toBe(true);
    expect(isValidTransition('done', 'embedding')).toBe(true);
    expect(isValidTransition('error', 'embedding')).toBe(true);
  });

  it('rejects backwards transitions and ignores them in the reducer', () => {
    expect(isValidTransition('comparing', 'flying')).toBe(false);
    expect(isValidTransition('error', 'found')).toBe(false);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const s = reduceEvent({ ...start(), phase: 'comparing' }, { type: 'phase', phase: 'flying' });
    expect(s.phase).toBe('comparing');
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('accumulates tokens', () => {
    let s = reduceEvent(start(), { type: 'phase', phase: 'generating' });
    s = reduceEvent(s, { type: 'token', text: 'Lo' });
    s = reduceEvent(s, { type: 'token', text: 'RA' });
    expect(s.current.answer).toBe('LoRA');
  });

  it('marks citations verified / unverified on done', () => {
    let s = reduceEvent(start(), { type: 'retrieval', grounded_chunks: [chunk('a'), chunk('b')] });
    s = reduceEvent(s, { type: 'done', citations: ['a', 'z'], timings: { embed_ms: 1, route_ms: 1, search_ms: 1, rerank_ms: 1, llm_ms: 1, total_ms: 5 } });
    expect(s.phase).toBe('done');
    expect(s.current.citationChecks).toEqual([
      { paper_id: 'a', status: 'verified' },
      { paper_id: 'z', status: 'unverified' },
    ]);
    expect(checkCitations([], [])).toEqual([]);
  });

  it('error event sets phase and message, later events are ignored', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    let s = reduceEvent({ ...start(), phase: 'flying' }, { type: 'error', message: 'boom', status: 503 });
    expect(s.phase).toBe('error');
    expect(s.current.error).toBe('boom');
    s = reduceEvent(s, { type: 'token', text: 'late' });
    expect(s.current.answer).toBe('');
    warn.mockRestore();
  });

  it('visualPhase advances one step and never passes phase', () => {
    expect(advanceVisual('embedding', 'found')).toBe('flying');
    expect(advanceVisual('found', 'found')).toBe('found');
    expect(advanceVisual('generating', 'done')).toBe('done');
    expect(advanceVisual('done', 'done')).toBe('done');
    expect(advanceVisual('comparing', 'error')).toBe('error');
  });

  it('keeps route / compare / retrieval data', () => {
    let s = reduceEvent(start(), { type: 'route', steps: [{ depth: 1, candidates: [{ node_id: 3, score: 0.82 }], chosen: [3] }] });
    s = reduceEvent(s, { type: 'compare', candidates: [{ paper_id: 'a', score: 0.9 }] });
    s = reduceEvent(s, { type: 'retrieval', grounded_chunks: [chunk('a')], expanded_terms: ['lora'] });
    expect(s.current.route[0].chosen).toEqual([3]);
    expect(s.current.compare).toHaveLength(1);
    expect(s.current.expanded_terms).toEqual(['lora']);
  });
});
