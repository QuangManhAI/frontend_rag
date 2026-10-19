import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUi } from '../../store/uiStore';
import { CitationChip, UNVERIFIED_TIP } from './CitationChip';
import { Markdown } from './Markdown';

describe('CitationChip', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('click calls focusPaper with the paper id and context', () => {
    const focusPaper = vi.fn();
    useUi.setState({ focusPaper });
    const ctx = { citationChecks: [], grounded: [] };
    render(<CitationChip paperId="2310.00297" status="verified" context={ctx} />);
    fireEvent.click(screen.getByRole('button', { name: /2310\.00297/ }));
    expect(focusPaper).toHaveBeenCalledWith('2310.00297', { context: ctx });
  });

  it('unverified chip carries a warning tooltip', () => {
    render(<CitationChip paperId="2412.99999" status="unverified" context={null} />);
    const chip = screen.getByRole('button', { name: /chưa xác minh/ });
    expect(chip).toHaveAttribute('data-status', 'unverified');
    expect(screen.getByRole('tooltip')).toHaveTextContent(UNVERIFIED_TIP);
    expect(chip).toHaveAccessibleDescription(new RegExp(UNVERIFIED_TIP));
  });
});

describe('Markdown answer rendering', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders [Paper: a, b] as two chips', () => {
    render(<Markdown text="Kết quả [Paper: 2310.00297, 2401.12345] rất tốt." />);
    const chips = document.querySelectorAll('.cite-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveAttribute('data-paper-id', '2310.00297');
    expect(chips[1]).toHaveAttribute('data-paper-id', '2401.12345');
  });

  it('renders display math with KaTeX and keeps citations next to it', () => {
    const { container } = render(<Markdown text={'$$L = \\sum_i x_i$$\n\nxem [Paper: 2310.00297]'} />);
    expect(container.querySelector('.katex-display')).not.toBeNull();
    expect(container.querySelectorAll('.cite-chip')).toHaveLength(1);
  });

  it('does not execute or inject raw HTML', () => {
    const { container } = render(<Markdown text={'<script>alert(1)</script> <img src=x onerror=alert(1)>'} />);
    expect(container.querySelector('script')).toBeNull();
    expect(container.querySelector('img')).toBeNull();
  });

  it('marks chips from known checks', () => {
    render(<Markdown text="a [Paper: x] b [Paper: y]" checks={[{ paper_id: 'x', status: 'verified' }, { paper_id: 'y', status: 'unverified' }]} />);
    const chips = document.querySelectorAll('.cite-chip');
    expect(chips[0]).toHaveAttribute('data-status', 'verified');
    expect(chips[1]).toHaveAttribute('data-status', 'unverified');
  });
});
