import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Guards the design-system scales in index.css (docs/FE_DESIGN_SYSTEM.md §3–§5, §7). */
const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

const block = (head: string) => {
  const start = css.indexOf(head);
  return css.slice(start, css.indexOf('\n}', start));
};
const names = (src: string, prefix: string) => [...src.matchAll(new RegExp(`(${prefix}[\\w-]+):`, 'g'))].map((m) => m[1]);

/** Declarations outside :root and @theme (rule bodies only, keyframes included). */
const outsideTokens = css.replace(/:root\s*\{[\s\S]*?\n\}/, '').replace(/@theme\s*\{[\s\S]*?\n\}/, '');

describe('design-system scales', () => {
  const theme = block('@theme {');

  it('radius: Tailwind defaults cleared, exactly xs · sm · md · lg · full', () => {
    expect(theme).toContain('--radius-*: initial;');
    expect(names(theme, '--radius-').filter((n) => n !== '--radius-*')).toEqual(['--radius-xs', '--radius-sm', '--radius-md', '--radius-lg', '--radius-full']);
  });

  it('blur: defaults cleared, exactly sm · md · lg', () => {
    expect(theme).toContain('--blur-*: initial;');
    expect(names(theme, '--blur-').filter((n) => n !== '--blur-*')).toEqual(['--blur-sm', '--blur-md', '--blur-lg']);
  });

  it('four custom text sizes next to Tailwind xs/sm/base', () => {
    expect(names(theme, '--text-').filter((n) => !n.endsWith('--line-height'))).toEqual(['--text-micro', '--text-caption', '--text-control', '--text-display']);
  });

  it('no raw radius, blur, font size, color or easing outside the token blocks', () => {
    expect(outsideTokens).not.toMatch(/border-radius:[^;]*\d(px|%)/);
    expect(outsideTokens).not.toMatch(/backdrop-filter:[^;]*blur\(\s*[\d.]+px/);
    expect(outsideTokens).not.toMatch(/font-size:\s*[\d.]+(px|rem)\s*;/);
    expect(outsideTokens).not.toMatch(/rgba?\(|#[0-9a-fA-F]{3,8}\b/);
    expect(outsideTokens).not.toMatch(/cubic-bezier\(/);
  });
});
