import { act, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUi } from '../store/uiStore';
import { useGlassLevel, useLiquidLight } from './useLiquidLight';

// jsdom has no PointerEvent; a MouseEvent of type 'pointermove' carries the same clientX/Y.
describe('useLiquidLight', () => {
  let frames: FrameRequestCallback[];
  beforeEach(() => {
    frames = [];
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb));
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => vi.unstubAllGlobals());

  const flush = () => {
    const run = frames;
    frames = [];
    run.forEach((cb) => cb(0));
  };

  /** Two lit surfaces and one that must not be touched (a plain chip). */
  const surfaces = () => {
    const scope = document.createElement('div');
    scope.innerHTML = '<div class="glass" data-shape="panel"></div><button class="glass" data-shape="control" data-interactive="true"></button><span class="glass" data-shape="chip"></span>';
    const [panel, button, chip] = Array.from(scope.children) as HTMLElement[];
    return { scope, panel, button, chip };
  };

  it('writes at most once per frame, only on lit surfaces, and never re-renders the host', () => {
    const { scope, panel, button, chip } = surfaces();
    const spies = [panel, button, chip].map((el) => vi.spyOn(el.style, 'setProperty'));
    let renders = 0;
    function Host() {
      renders++;
      useLiquidLight(true, scope);
      return null;
    }
    render(<Host />);
    const rendersAfterMount = renders;
    spies.forEach((s) => s.mockClear());
    for (let i = 0; i < 1000; i++) window.dispatchEvent(new MouseEvent('pointermove', { clientX: i % 800, clientY: 100 }));
    expect(frames.length).toBe(1); // one frame scheduled for 1000 events
    flush();
    expect(spies[0]).toHaveBeenCalledTimes(2); // --lg-light-x and --lg-light-y, once
    expect(spies[1]).toHaveBeenCalledTimes(2);
    expect(spies[2]).not.toHaveBeenCalled(); // chips have no specular rim
    expect(renders).toBe(rendersAfterMount);
  });

  it('eases toward the pointer and rests above the screen when inactive', () => {
    const { scope, panel } = surfaces();
    const { rerender } = renderHook(({ on }) => useLiquidLight(on, scope), { initialProps: { on: true } });
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: window.innerWidth, clientY: window.innerHeight / 2 }));
    for (let i = 0; i < 80 && frames.length; i++) flush();
    expect(Number(panel.style.getPropertyValue('--lg-light-x'))).toBeCloseTo(1, 2);
    rerender({ on: false });
    expect(panel.style.getPropertyValue('--lg-light-x')).toBe('0.000');
    expect(panel.style.getPropertyValue('--lg-light-y')).toBe('-1.000');
  });

  it('does not listen when inactive (reduced motion or level < 2)', () => {
    const { scope } = surfaces();
    renderHook(() => useLiquidLight(false, scope));
    window.dispatchEvent(new MouseEvent('pointermove', { clientX: 10, clientY: 10 }));
    expect(frames.length).toBe(0);
  });
});

describe('useGlassLevel', () => {
  it('mirrors the chosen level on the root element', () => {
    const root = document.createElement('div');
    act(() => useUi.getState().updateSettings({ glass: 'off' }));
    const { result } = renderHook(() => useGlassLevel(root));
    expect(result.current).toBe(0);
    expect(root.dataset.lgLevel).toBe('0');
    act(() => useUi.getState().updateSettings({ glass: 'frosted' }));
    expect(root.dataset.lgLevel).toBe('1');
    act(() => useUi.getState().resetSettings());
  });

  it('rejects an unknown glass setting', () => {
    expect(useUi.getState().updateSettings({ glass: 'shiny' as never })).toHaveProperty('glass');
  });
});
