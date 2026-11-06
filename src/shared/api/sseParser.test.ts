import { describe, expect, it, vi } from 'vitest';
import { parseSseBlock, SseBuffer } from './sseParser';

type Ev = { type: string; text?: string };

describe('SseBuffer + parseSseBlock', () => {
  it('joins an event split across two network chunks', () => {
    const b = new SseBuffer();
    expect(b.push('data: {"type":"token","te')).toEqual([]);
    const blocks = b.push('xt":"LoRA"}\n\n');
    expect(blocks).toHaveLength(1);
    expect(parseSseBlock<Ev>(blocks[0])).toEqual({ type: 'token', text: 'LoRA' });
  });

  it('splits several events in one chunk', () => {
    const b = new SseBuffer();
    const blocks = b.push('data: {"type":"phase","phase":"embedding"}\n\ndata: {"type":"token","text":"a"}\n\ndata: {"type":"tok');
    expect(blocks.map((x) => parseSseBlock<Ev>(x)?.type)).toEqual(['phase', 'token']);
    expect(b.push('en","text":"b"}\n\n').map((x) => parseSseBlock<Ev>(x)?.text)).toEqual(['b']);
  });

  it('handles CRLF and flushes a trailing block', () => {
    const b = new SseBuffer();
    expect(b.push('data: {"type":"done"}\r\n\r\ndata: {"type":"x"}')).toHaveLength(1);
    expect(b.flush().map((x) => parseSseBlock<Ev>(x)?.type)).toEqual(['x']);
  });

  it('joins multi-line data with \\n', () => {
    expect(parseSseBlock<Ev>('event: message\ndata: {"type":"token",\ndata: "text":"x"}')).toEqual({ type: 'token', text: 'x' });
  });

  it('ignores comment lines and comment-only blocks', () => {
    expect(parseSseBlock(': keep-alive')).toBeNull();
    expect(parseSseBlock<Ev>(': ping\ndata: {"type":"token","text":"y"}')).toEqual({ type: 'token', text: 'y' });
  });

  it('warns and returns null on bad JSON', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseSseBlock('data: {oops')).toBeNull();
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
