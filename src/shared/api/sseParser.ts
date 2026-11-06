/** Accumulates network chunks and emits complete SSE blocks (separated by a blank line). */
export class SseBuffer {
  private buffer = '';

  push(chunk: string): string[] {
    this.buffer += chunk.replace(/\r\n?/g, '\n');
    const blocks = this.buffer.split('\n\n');
    this.buffer = blocks.pop() ?? '';
    return blocks.filter((b) => b.trim().length > 0);
  }

  /** Whatever is left when the stream ends without a trailing blank line. */
  flush(): string[] {
    const rest = this.buffer;
    this.buffer = '';
    return rest.trim().length > 0 ? [rest] : [];
  }
}

/** JSON payload of one SSE block; comments and blocks without data → null; bad JSON → warn + null. */
export function parseSseBlock<T>(block: string): T | null {
  const data: string[] = [];
  for (const line of block.split('\n')) {
    if (line.startsWith(':')) continue;
    if (line.startsWith('data:')) data.push(line.slice(5).replace(/^ /, ''));
  }
  if (data.length === 0) return null;
  try {
    return JSON.parse(data.join('\n')) as T;
  } catch {
    console.warn('[sse] dropped malformed event:', data.join('\n').slice(0, 120));
    return null;
  }
}
