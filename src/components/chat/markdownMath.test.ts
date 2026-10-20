import { describe, expect, it } from 'vitest';
import { normalizeDisplayMath } from './Markdown';

describe('normalizeDisplayMath', () => {
  it('turns \\( … \\) into inline $ … $', () => {
    expect(normalizeDisplayMath('matrix \\( W \\in \\mathbb{R}^{d \\times h} \\) is frozen')).toBe(
      'matrix $W \\in \\mathbb{R}^{d \\times h}$ is frozen',
    );
  });

  it('turns \\[ … \\] into display math', () => {
    expect(normalizeDisplayMath('\\[ W' + "'" + ' = W + BA \\]')).toBe('$$\n W' + "'" + ' = W + BA \n$$');
  });

  it('leaves $ … $ alone', () => {
    expect(normalizeDisplayMath('rank $r \\ll d$')).toBe('rank $r \\ll d$');
  });
});
