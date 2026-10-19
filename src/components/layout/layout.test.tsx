import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useUi, DEFAULT_SETTINGS } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';
import { ThemeToggle } from './ThemeToggle';
import { HealthBanner, HealthDots } from './HealthBanner';
import { SettingsPanel } from './SettingsPanel';
import { YearSlider } from './YearSlider';
import { CategoryLegend } from './CategoryLegend';
import { LoadingTree } from './LoadingTree';
import { TopBar } from './TopBar';

describe('Layout Components', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useUi.setState({
      theme: 'dark',
      settingsOpen: false,
      settings: { ...DEFAULT_SETTINGS },
      maxYear: null,
    });
  });

  describe('ThemeToggle', () => {
    it('toggles theme on click', () => {
      render(<ThemeToggle />);
      const btn = screen.getByTestId('theme-toggle');
      fireEvent.click(btn);
      expect(useUi.getState().theme).toBe('light');

      fireEvent.click(btn);
      expect(useUi.getState().theme).toBe('dark');
    });
  });

  describe('HealthBanner & HealthDots', () => {
    it('renders HealthDots when healthy', () => {
      render(<HealthDots health={{ lancedb: true, llm: true, world: true }} />);
      expect(screen.getByLabelText('Trạng thái hệ thống')).toBeDefined();
    });

    it('renders HealthBanner when component is down or unreachable', () => {
      const { rerender } = render(<HealthBanner health={{ lancedb: false, llm: true, world: true }} />);
      expect(screen.getByTestId('health-banner')).toHaveTextContent(/LanceDB không phản hồi/);

      rerender(<HealthBanner health="unreachable" />);
      expect(screen.getByTestId('health-banner')).toHaveTextContent(/Backend không phản hồi/);

      rerender(<HealthBanner health={{ lancedb: true, llm: true, world: true }} />);
      expect(screen.queryByTestId('health-banner')).toBeNull();
    });
  });

  describe('SettingsPanel', () => {
    it('returns null when settingsOpen is false', () => {
      useUi.setState({ settingsOpen: false });
      const { container } = render(<SettingsPanel />);
      expect(container.firstChild).toBeNull();
    });

    it('renders dialog, allows updating top_k and closing', () => {
      useUi.setState({ settingsOpen: true });
      render(<SettingsPanel />);

      expect(screen.getByTestId('settings-panel')).toBeDefined();
      const input = screen.getByTestId('setting-top_k');
      fireEvent.change(input, { target: { value: '12' } });
      expect(useUi.getState().settings.top_k).toBe(12);

      // Category select
      const select = screen.getByRole('combobox');
      fireEvent.change(select, { target: { value: '' } });

      // Quality button
      const highBtn = screen.getByTestId('quality-high');
      fireEvent.click(highBtn);
      expect(useUi.getState().settings.quality).toBe('high');

      // Checkbox toggle
      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      // Reset button
      const resetBtn = screen.getByRole('button', { name: /Đặt lại/ });
      fireEvent.click(resetBtn);

      const closeBtn = screen.getByRole('button', { name: 'Đóng cài đặt' });
      fireEvent.click(closeBtn);
      expect(useUi.getState().settingsOpen).toBe(false);
    });
  });

  describe('YearSlider', () => {
    it('returns null when vectors not loaded', () => {
      useWorld.setState({ vectors: null });
      const { container } = render(<YearSlider />);
      expect(container.firstChild).toBeNull();
    });

    it('renders slider when vectors are present and updates maxYear', () => {
      useWorld.setState({
        vectors: {
          count: 3,
          positions: new Float32Array(9),
          years: new Uint16Array([2020, 2022, 2024]),
          categories: new Uint16Array(3),
          twigIds: new Uint32Array(3),
          crateIds: new Uint32Array(3),
          authority: new Float32Array(3),
          flags: new Uint8Array(3),
        },
      });

      render(<YearSlider />);
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '2022' } });
      expect(useUi.getState().maxYear).toBe(2022);
    });
  });

  describe('CategoryLegend', () => {
    it('returns null when categories empty', () => {
      useWorld.setState({ categories: [] });
      const { container } = render(<CategoryLegend />);
      expect(container.firstChild).toBeNull();
    });

    it('renders categories and triggers highlight on click', () => {
      useWorld.setState({
        categories: [{ index: 0, code: 'cs.CV', name: 'Computer Vision', paper_count: 100 }],
        vectorsByCategory: new Map([[0, new Uint32Array([0, 1])]]),
      });

      render(<CategoryLegend />);
      const btn = screen.getByRole('button', { name: /Computer Vision/ });
      fireEvent.click(btn);
      expect(useUi.getState().highlights).toEqual(new Uint32Array([0, 1]));
    });
  });

  describe('LoadingTree & TopBar', () => {
    it('renders LoadingTree progress and error state', () => {
      const { rerender } = render(<LoadingTree />);
      expect(screen.getByText('Đang dựng cây tri thức…')).toBeDefined();

      const onRetry = vi.fn();
      rerender(<LoadingTree error="Lỗi kết nối" onRetry={onRetry} />);
      expect(screen.getByText(/Không tải được thế giới: Lỗi kết nối/)).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Thử lại' }));
      expect(onRetry).toHaveBeenCalledTimes(1);
    });

    it('renders TopBar with title and triggers settings', () => {
      render(<TopBar health={null} />);
      expect(screen.getByRole('heading', { name: 'Cây Tri Thức Vector' })).toBeDefined();

      const settingsBtn = screen.getByRole('button', { name: 'Cài đặt' });
      fireEvent.click(settingsBtn);
      expect(useUi.getState().settingsOpen).toBe(true);
    });
  });

  describe('YearSlider playback & useHealth', () => {
    it('handles playback in YearSlider', () => {
      useWorld.setState({
        vectors: {
          count: 3,
          positions: new Float32Array(9),
          years: new Uint16Array([2020, 2022, 2024]),
          categories: new Uint16Array(3),
          twigIds: new Uint32Array(3),
          crateIds: new Uint32Array(3),
          authority: new Float32Array(3),
          flags: new Uint8Array(3),
        },
      });

      render(<YearSlider />);
      const playBtn = screen.getByRole('button', { name: 'Phát theo thời gian' });
      fireEvent.click(playBtn);
      expect(screen.getByRole('button', { name: 'Dừng phát' })).toBeDefined();
      fireEvent.click(screen.getByRole('button', { name: 'Dừng phát' }));
      expect(screen.getByRole('button', { name: 'Phát theo thời gian' })).toBeDefined();
    });

    it('polls health status with useHealth hook', async () => {
      const { renderHook, waitFor } = await import('@testing-library/react');
      const { useHealth } = await import('./HealthBanner');
      const { result } = renderHook(() => useHealth());
      await waitFor(() => expect(result.current).not.toBeNull());
    });
  });

  describe('AppShell', () => {
    it('renders AppShell in loading state and ready state', async () => {
      const { AppShell } = await import('./AppShell');
      useWorld.setState({ status: 'loading', error: null });

      const { rerender } = render(<AppShell />);
      expect(screen.getByTestId('loading-tree')).toBeDefined();

      useWorld.setState({ status: 'ready', categories: [] });
      useUi.setState({ highlightLabel: { kind: 'category', id: 0, label: 'cs.AI' } });
      rerender(<AppShell />);
      expect(screen.getByTestId('filter-chip')).toBeDefined();

      // Test Escape key handling
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useUi.getState().highlights).toBeNull();

      // Test Chat closed
      useUi.setState({ chatOpen: false });
      rerender(<AppShell />);
      expect(screen.getByRole('button', { name: 'Mở chat' })).toBeDefined();

      // Test Paper panel open
      useUi.setState({ panelPaperId: 'p1' });
      rerender(<AppShell />);
      expect(screen.getByTestId('paper-panel')).toBeDefined();

      // Test Settings open escape
      useUi.setState({ settingsOpen: true });
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(useUi.getState().settingsOpen).toBe(false);
    });

    it('renders mobile BottomSheet when matchMedia matches', async () => {
      const originalMatchMedia = globalThis.matchMedia;
      globalThis.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('max-width: 767px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      const { AppShell } = await import('./AppShell');
      useWorld.setState({ status: 'ready', categories: [] });
      render(<AppShell />);

      const slider = screen.getByRole('slider', { name: /Kéo để thay đổi chiều cao chat/i });
      expect(slider).toBeDefined();

      fireEvent.keyDown(slider, { key: 'ArrowUp' });
      fireEvent.keyDown(slider, { key: 'ArrowDown' });

      slider.setPointerCapture = vi.fn();
      fireEvent.pointerDown(slider, { clientY: 100, pointerId: 1 });
      fireEvent.pointerMove(slider, { clientY: 50 });
      fireEvent.pointerUp(slider);

      globalThis.matchMedia = originalMatchMedia;
    });
  });
});
