import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS, useUi } from '../../shared/store/uiStore';
import { ThemeToggle } from './ThemeToggle';

describe('ThemeToggle Component', () => {
  beforeEach(() => {
    useUi.setState({
      settings: { ...DEFAULT_SETTINGS, themeMode: 'dark', reduceMotion: false },
      systemTheme: 'dark',
    });
  });

  it('renders correctly in dark mode', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    expect(button).toBeDefined();
    expect(button.getAttribute('data-theme')).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Chuyển sang giao diện Sáng');
    expect(button.getAttribute('title')).toBe('Chuyển sang giao diện Sáng');
  });

  it('toggles from dark to light on click', () => {
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');

    fireEvent.click(button);
    expect(useUi.getState().settings.themeMode).toBe('light');
  });

  it('toggles from light to dark on click', () => {
    useUi.setState({
      settings: { ...DEFAULT_SETTINGS, themeMode: 'light' },
      systemTheme: 'dark',
    });
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');

    expect(button.getAttribute('data-theme')).toBe('light');
    expect(button.getAttribute('aria-label')).toBe('Chuyển sang giao diện Tối');

    fireEvent.click(button);
    expect(useUi.getState().settings.themeMode).toBe('dark');
  });

  it('resolves system mode and toggles to opposite', () => {
    useUi.setState({
      settings: { ...DEFAULT_SETTINGS, themeMode: 'system' },
      systemTheme: 'light',
    });
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');

    // Currently resolved to light because systemTheme is light
    expect(button.getAttribute('data-theme')).toBe('light');

    fireEvent.click(button);
    // Should switch to dark
    expect(useUi.getState().settings.themeMode).toBe('dark');
  });

  it('respects reduceMotion setting without crashing', () => {
    useUi.setState({
      settings: { ...DEFAULT_SETTINGS, themeMode: 'dark', reduceMotion: true },
      systemTheme: 'dark',
    });
    render(<ThemeToggle />);
    const button = screen.getByTestId('theme-toggle');
    expect(button).toBeDefined();
  });
});
