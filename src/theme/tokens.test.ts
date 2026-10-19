import { describe, expect, it } from 'vitest';
import { categoryColor, darkTheme, lightTheme } from './tokens';

describe('theme tokens', () => {
  it('both themes define the same keys', () => {
    expect(Object.keys(darkTheme).sort()).toEqual(Object.keys(lightTheme).sort());
  });

  it('has 12 distinct category colors per theme, all hex', () => {
    for (const t of [darkTheme, lightTheme]) {
      expect(t.categoryPalette).toHaveLength(12);
      expect(new Set(t.categoryPalette).size).toBe(12);
      for (const c of [...t.categoryPalette, t.categoryOther]) expect(c).toMatch(/^#[0-9a-f]{6}([0-9a-f]{2})?$/i);
    }
  });

  it('categoryColor picks neon in dark and pastel in light', () => {
    expect(categoryColor(0, darkTheme)).toBe(darkTheme.categoryPalette[0]);
    expect(categoryColor(0, lightTheme)).toBe(lightTheme.categoryPalette[0]);
    expect(categoryColor(0, darkTheme)).not.toBe(categoryColor(0, lightTheme));
  });

  it('out-of-range index falls back to "other"', () => {
    expect(categoryColor(12, darkTheme)).toBe(darkTheme.categoryOther);
    expect(categoryColor(-1, lightTheme)).toBe(lightTheme.categoryOther);
    expect(categoryColor(1.5, darkTheme)).toBe(darkTheme.categoryOther);
  });

  it('applies CSS variables to DOM', async () => {
    const { applyCssVars } = await import('./applyCssVars');
    const el = document.createElement('div');
    applyCssVars(darkTheme, el);
    expect(el.style.getPropertyValue('--bg')).toBe(darkTheme.bg);
    expect(el.dataset.theme).toBe('dark');
  });

  it('useThemeSync listens to system media query', async () => {
    const { renderHook } = await import('@testing-library/react');
    const { useThemeSync, useTheme } = await import('./useTheme');
    const { useUi } = await import('../store/uiStore');

    useUi.setState({ themeSource: 'system' });
    const { unmount } = renderHook(() => {
      useThemeSync();
      return useTheme();
    });
    expect(document.documentElement.dataset.theme).toBeDefined();
    unmount();
  });
});
