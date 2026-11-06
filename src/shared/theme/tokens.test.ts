import { describe, expect, it } from 'vitest';
import { categoryColor, darkTheme } from './tokens';

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
});
