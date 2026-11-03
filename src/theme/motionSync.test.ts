import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { CHAT_SLIDE_S } from '../utils/animationConfig';

const css = readFileSync(resolve(process.cwd(), 'src/index.css'), 'utf8');

describe('motion tokens stay in sync with the 3D scene', () => {
  it('--dur-scene equals the camera slide that follows the chat column', () => {
    const m = /--dur-scene:\s*(\d+)ms/.exec(css);
    expect(m).not.toBeNull();
    expect(Number(m?.[1])).toBe(CHAT_SLIDE_S * 1000);
  });

  it('the chat column slides with --dur-scene and --ease-scene', () => {
    expect(css).toMatch(/\.chat-slide-in\s*\{[^}]*var\(--dur-scene\) var\(--ease-scene\)/);
    expect(css).toMatch(/\.chat-slide-out\s*\{[^}]*var\(--dur-scene\) var\(--ease-scene\)/);
  });
});
