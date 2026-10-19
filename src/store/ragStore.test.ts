import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useRag } from './ragStore';

describe('useRag Zustand store', () => {
  beforeEach(() => {
    useRag.setState({
      messages: [],
      phase: 'idle',
      visualPhase: 'idle',
      runId: 0,
      skipped: false,
      skipToken: 0,
    });
  });

  it('initializes with empty state', () => {
    const state = useRag.getState();
    expect(state.messages).toEqual([]);
    expect(state.phase).toBe('idle');
    expect(state.visualPhase).toBe('idle');
    expect(state.runId).toBe(0);
  });

  it('ignores empty send input', async () => {
    await useRag.getState().send('   ');
    expect(useRag.getState().runId).toBe(0);
    expect(useRag.getState().messages.length).toBe(0);
  });

  it('sends query, updates messages, streams events and finishes', async () => {
    const promise = useRag.getState().send('What is LoRA?');
    const immediateState = useRag.getState();
    expect(immediateState.runId).toBe(1);
    expect(immediateState.messages.length).toBe(2);
    expect(immediateState.messages[0].role).toBe('user');
    expect(immediateState.messages[1].role).toBe('assistant');

    await promise;

    const finalState = useRag.getState();
    expect(finalState.phase).toBe('done');
    expect(finalState.messages[1].status).toBe('done');
    expect(finalState.messages[1].content.length).toBeGreaterThan(0);
  });

  it('allows stopping an active stream', async () => {
    const promise = useRag.getState().send('Attention mechanism');
    await new Promise((resolve) => setTimeout(resolve, 200));
    useRag.getState().stop();
    await promise;

    const state = useRag.getState();
    expect(state.phase).toBe('error');
    expect(state.current.error).toBe('Đã dừng.');
  });

  it('advances visual phase and skips animation', () => {
    useRag.setState({ phase: 'done', visualPhase: 'embedding', skipped: false });

    useRag.getState().advanceVisual();
    expect(useRag.getState().visualPhase).not.toBe('embedding');

    useRag.getState().skipAnimation();
    expect(useRag.getState().visualPhase).toBe('done');
    expect(useRag.getState().skipped).toBe(true);
    expect(useRag.getState().skipToken).toBe(1);
  });
});
