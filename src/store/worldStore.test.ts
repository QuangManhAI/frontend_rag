import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useWorld } from './worldStore';
import * as client from '../api/client';

describe('useWorld Zustand store', () => {
  beforeEach(() => {
    useWorld.setState({
      status: 'idle',
      error: null,
      categories: [],
      ground: null,
      tree: [],
      nodesById: new Map(),
      childrenById: new Map(),
      vectors: null,
      vectorIds: [],
      vectorIndexByPaperId: new Map(),
      vectorsByCrate: new Map(),
      vectorsByCategory: new Map(),
    });
  });

  it('starts in idle status', () => {
    expect(useWorld.getState().status).toBe('idle');
  });

  it('loads world successfully and groups vectors', async () => {
    await useWorld.getState().load();

    const state = useWorld.getState();
    expect(state.status).toBe('ready');
    expect(state.categories.length).toBeGreaterThan(0);
    expect(state.tree.length).toBeGreaterThan(0);
    expect(state.nodesById.size).toBe(state.tree.length);
    expect(state.childrenById.size).toBeGreaterThan(0);
    expect(state.vectors).toBeDefined();
    expect(state.vectorIds.length).toBeGreaterThan(0);
    expect(state.vectorIndexByPaperId.size).toBe(state.vectorIds.length);
  });

  it('exits early if already loading or ready', async () => {
    useWorld.setState({ status: 'ready' });
    const spy = vi.spyOn(client, 'loadWorld');
    await useWorld.getState().load();
    expect(spy).not.toHaveBeenCalled();
  });

  it('handles load error', async () => {
    vi.spyOn(client, 'loadWorld').mockRejectedValueOnce(new Error('Network offline'));
    await useWorld.getState().load();

    expect(useWorld.getState().status).toBe('error');
    expect(useWorld.getState().error).toBe('Network offline');
  });
});
