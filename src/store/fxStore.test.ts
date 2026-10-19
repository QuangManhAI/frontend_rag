import { describe, expect, it, beforeEach } from 'vitest';
import { useFx, flightProbe } from './fxStore';

describe('useFx Zustand store & flightProbe', () => {
  beforeEach(() => {
    useFx.getState().reset();
  });

  it('initializes with default empty visual state', () => {
    const s = useFx.getState();
    expect(s.overlay.size).toBe(0);
    expect(s.branchMarks.size).toBe(0);
    expect(s.routeLabels).toEqual([]);
    expect(s.pulsingCrates.size).toBe(0);
    expect(s.topK).toEqual([]);
    expect(s.anchor).toBeNull();
  });

  it('updates overlay and patches overlay incrementally', () => {
    const m = new Map([[1, 2], [2, 3]]);
    useFx.getState().setOverlay(m);
    expect(useFx.getState().overlay.get(1)).toBe(2);

    useFx.getState().patchOverlay([[2, 4], [3, 1]]);
    expect(useFx.getState().overlay.get(1)).toBe(2);
    expect(useFx.getState().overlay.get(2)).toBe(4);
    expect(useFx.getState().overlay.get(3)).toBe(1);
  });

  it('sets branch marks, route labels, pulsing crates and found items', () => {
    useFx.getState().setBranchMarks(new Map([[10, 1]]));
    expect(useFx.getState().branchMarks.get(10)).toBe(1);

    useFx.getState().setRouteLabels([{ node_id: 1, score: 0.95, chosen: true }]);
    expect(useFx.getState().routeLabels.length).toBe(1);

    useFx.getState().setPulsingCrates(new Set([42]));
    expect(useFx.getState().pulsingCrates.has(42)).toBe(true);

    useFx.getState().setFound(
      [{ paper_id: 'p1', index: 0, rank: 1, final_score: 0.9, chunkCount: 2 }],
      [10, 20, 30],
    );
    expect(useFx.getState().topK.length).toBe(1);
    expect(useFx.getState().anchor).toEqual([10, 20, 30]);

    useFx.getState().reset();
    expect(useFx.getState().topK.length).toBe(0);
    expect(useFx.getState().anchor).toBeNull();
  });

  it('supports mutating flightProbe', () => {
    flightProbe.active = true;
    flightProbe.position = [1, 2, 3];
    expect(flightProbe.active).toBe(true);
    expect(flightProbe.position).toEqual([1, 2, 3]);
  });
});
