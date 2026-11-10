import { describe, expect, it } from 'vitest';
import { categoryColor, darkTheme, lightTheme, resolveTheme, themes } from './tokens';

describe('theme tokens', () => {
  it('has 12 distinct category colors, all hex', () => {
    expect(darkTheme.categoryPalette).toHaveLength(12);
    expect(new Set(darkTheme.categoryPalette).size).toBe(12);
    for (const c of [...darkTheme.categoryPalette, darkTheme.categoryOther]) expect(c).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);
  });

  it('categoryColor picks the palette slot', () => {
    expect(categoryColor(0, darkTheme)).toBe(darkTheme.categoryPalette[0]);
  });

  it('out-of-range index falls back to "other"', () => {
    expect(categoryColor(12, darkTheme)).toBe(darkTheme.categoryOther);
    expect(categoryColor(-1, darkTheme)).toBe(darkTheme.categoryOther);
    expect(categoryColor(1.5, darkTheme)).toBe(darkTheme.categoryOther);
  });

  it('applies CSS variables to DOM', async () => {
    const { applyCssVars } = await import('./applyCssVars');
    const el = document.createElement('div');
    applyCssVars(darkTheme, el);
    expect(el.style.getPropertyValue('--bg')).toBe(darkTheme.bg);
    expect(el.dataset.theme).toBe('dark');
  });

  it('glass and faint-ink tokens reach the DOM (FE_DESIGN_SYSTEM §2.2)', async () => {
    const { applyCssVars } = await import('./applyCssVars');
    const el = document.createElement('div');
    applyCssVars(darkTheme, el);
    const expected: Record<string, string> = {
      '--ink-faint': '#64607e',
      '--glass-tint': '#0c0a183d',
      '--glass-fill': '#ffffff0a',
      '--glass-fill-hover': '#ffffff14',
      '--glass-highlight': '#ffffff29',
      '--glass-highlight-strong': '#ffffff3d',
      '--glass-lowlight': '#ffffff0a',
      '--glass-stroke-strong': '#ffffff38',
    };
    for (const [name, value] of Object.entries(expected)) expect(el.style.getPropertyValue(name)).toBe(value);
  });

  it('one border alpha: uiBorder merged with the 0.14 glass edge (P17, Phụ lục A #1)', () => {
    expect(darkTheme.uiBorder).toBe('#ffffff24');
    expect(darkTheme.uiSurface).toBe('#120f2499');
    expect(darkTheme.uiSurfaceStrong).toBe('#151129e6');
  });

  it('useThemeSync writes the dark theme to the document', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { useThemeSync, useTheme } = await import('./useTheme');
    const { result, unmount } = renderHook(() => {
      useThemeSync();
      return useTheme();
    });
    expect(result.current).toBe(darkTheme);
    expect(document.documentElement.dataset.theme).toBe('dark');
    unmount();
  });

  it('light theme mirrors the dark token set (same keys, 12 distinct petal colors)', () => {
    expect(Object.keys(lightTheme).sort()).toEqual(Object.keys(darkTheme).sort());
    expect(new Set(lightTheme.categoryPalette).size).toBe(12);
    expect(themes.light).toBe(lightTheme);
    expect(lightTheme.vectorFlowers).toBe(true);
    expect(lightTheme.stars).toBe(false);
    expect(darkTheme.vectorFlowers).toBe(false);
  });

  it('resolveTheme follows the OS only in system mode', () => {
    expect(resolveTheme('system', 'light')).toBe('light');
    expect(resolveTheme('system', 'dark')).toBe('dark');
    expect(resolveTheme('dark', 'light')).toBe('dark');
    expect(resolveTheme('light', 'dark')).toBe('light');
  });

  it('useThemeSync follows prefers-color-scheme while the mode is system, and an explicit pick wins', async () => {
    const { renderHook, act } = await import('@testing-library/react');
    const { useThemeSync, useTheme } = await import('./useTheme');
    const { useUi } = await import('../store/uiStore');
    let light = true;
    const listeners = new Set<() => void>();
    const original = globalThis.matchMedia;
    globalThis.matchMedia = ((query: string) => ({
      get matches() {
        return query.includes('light') ? light : false;
      },
      media: query,
      addEventListener: (_: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
    })) as unknown as typeof globalThis.matchMedia;
    try {
      useUi.getState().updateSettings({ themeMode: 'system' });
      const { result, unmount } = renderHook(() => {
        useThemeSync();
        return useTheme();
      });
      expect(result.current).toBe(lightTheme);
      expect(document.documentElement.dataset.theme).toBe('light');
      light = false;
      act(() => listeners.forEach((fn) => fn()));
      expect(result.current).toBe(darkTheme);
      act(() => {
        useUi.getState().updateSettings({ themeMode: 'light' });
      });
      expect(result.current).toBe(lightTheme);
      expect(document.documentElement.style.getPropertyValue('--bg')).toBe(lightTheme.bg);
      unmount();
      expect(listeners.size).toBe(0);
    } finally {
      globalThis.matchMedia = original;
      useUi.getState().resetSettings();
      useUi.getState().setSystemTheme('dark');
    }
  });

  it('rejects an unknown theme mode', async () => {
    const { validateSettings } = await import('../store/uiStore');
    expect(validateSettings({ themeMode: 'sepia' as never }).themeMode).toBeTruthy();
    expect(validateSettings({ themeMode: 'light' })).toEqual({});
  });
});
