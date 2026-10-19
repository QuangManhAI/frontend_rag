import { describe, expect, it, beforeEach } from 'vitest';
import { useUi, validateSettings, systemTheme, DEFAULT_SETTINGS } from './uiStore';
import { useWorld } from './worldStore';

describe('useUi Zustand store', () => {
  beforeEach(() => {
    useUi.setState({
      theme: 'dark',
      themeSource: 'user',
      cameraMode: 'overview',
      previousCameraMode: 'overview',
      cameraTarget: null,
      focusedPaperId: null,
      panelPaperId: null,
      focusContext: null,
      hoveredVectorIndex: null,
      tooltip: null,
      highlights: null,
      highlightLabel: null,
      maxYear: null,
      settings: { ...DEFAULT_SETTINGS },
      qualityTier: 0,
      chatOpen: true,
      settingsOpen: false,
    });
  });

  describe('systemTheme and validateSettings', () => {
    it('detects system theme', () => {
      const theme = systemTheme();
      expect(['dark', 'light']).toContain(theme);
    });

    it('validates settings correctly', () => {
      expect(Object.keys(validateSettings({ top_k: 5 })).length).toBe(0);
      expect(validateSettings({ top_k: 0 }).top_k).toBeDefined();
      expect(validateSettings({ top_k: 25 }).top_k).toBeDefined();
      expect(validateSettings({ nprobe: 0 }).nprobe).toBeDefined();
      expect(validateSettings({ nprobe: 10 }).nprobe).toBeDefined();
      expect(validateSettings({ quality: 'invalid' as any }).quality).toBeDefined();
    });
  });

  describe('Theme Actions', () => {
    it('sets and toggles theme', () => {
      useUi.getState().setTheme('light');
      expect(useUi.getState().theme).toBe('light');

      useUi.getState().toggleTheme();
      expect(useUi.getState().theme).toBe('dark');
    });
  });

  describe('Camera & Navigation', () => {
    it('sets camera mode and target', () => {
      useUi.getState().setCameraMode('tree', [0, 50, 0]);
      expect(useUi.getState().cameraMode).toBe('tree');
      expect(useUi.getState().cameraTarget).toEqual([0, 50, 0]);
    });

    it('focuses paper and closes focus', () => {
      useWorld.setState({
        vectorIds: ['p1'],
        vectorIndexByPaperId: new Map([['p1', 0]]),
        vectors: {
          count: 1,
          positions: new Float32Array([10, 20, 30]),
          years: new Uint16Array([2024]),
          categories: new Uint8Array([0]),
          twigIds: new Uint32Array([1]),
          crateIds: new Uint32Array([1]),
        },
      });

      useUi.getState().focusPaper('p1', { openPanel: true });
      expect(useUi.getState().panelPaperId).toBe('p1');
      expect(useUi.getState().focusedPaperId).toBe('p1');
      expect(useUi.getState().cameraMode).toBe('focus');

      useUi.getState().closeFocus();
      expect(useUi.getState().panelPaperId).toBeNull();
      expect(useUi.getState().focusedPaperId).toBeNull();
      expect(useUi.getState().cameraMode).not.toBe('focus');
    });
  });

  describe('Settings and UI Panels', () => {
    it('updates and resets settings', () => {
      const err = useUi.getState().updateSettings({ top_k: 10, quality: 'high' });
      expect(Object.keys(err).length).toBe(0);
      expect(useUi.getState().settings.top_k).toBe(10);
      expect(useUi.getState().settings.quality).toBe('high');

      const invalidErr = useUi.getState().updateSettings({ top_k: 50 });
      expect(invalidErr.top_k).toBeDefined();
      expect(useUi.getState().settings.top_k).toBe(10); // remains unchanged

      useUi.getState().resetSettings();
      expect(useUi.getState().settings.top_k).toBe(DEFAULT_SETTINGS.top_k);
    });

    it('controls chat and settings panel visibility', () => {
      useUi.getState().setChatOpen(false);
      expect(useUi.getState().chatOpen).toBe(false);

      useUi.getState().setSettingsOpen(true);
      expect(useUi.getState().settingsOpen).toBe(true);
    });

    it('sets quality tier, tooltip, and highlights', () => {
      useUi.getState().setQualityTier(2);
      expect(useUi.getState().qualityTier).toBe(2);

      useUi.getState().setTooltip({ kind: 'vector', id: 5, x: 100, y: 200 });
      expect(useUi.getState().tooltip?.id).toBe(5);

      useUi.getState().setHovered(5, { kind: 'vector', id: 5, x: 100, y: 200 });
      expect(useUi.getState().hoveredVectorIndex).toBe(5);

      const indices = new Uint32Array([1, 2, 3]);
      useUi.getState().setHighlights(indices, { kind: 'crate', id: 10, label: 'ML' });
      expect(useUi.getState().highlights).toBe(indices);
      expect(useUi.getState().highlightLabel?.label).toBe('ML');
    });
  });
});
