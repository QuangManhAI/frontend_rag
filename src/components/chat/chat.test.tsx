import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useUi } from '../../store/uiStore';
import { useRag } from '../../store/ragStore';
import { CitationChip, UNVERIFIED_TIP } from './CitationChip';
import { Markdown } from './Markdown';
import { ChatInput } from './ChatInput';
import { PipelineStatus } from './PipelineStatus';
import { MessageBubble } from './MessageBubble';
import { MessageList } from './MessageList';
import { ChatPanel, ChatReopenButton } from './ChatPanel';

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

describe('ChatInput', () => {
  beforeEach(() => {
    useRag.setState({ phase: 'idle' });
  });

  it('handles input and sends message on Enter', () => {
    const send = vi.fn();
    useRag.setState({ send });
    render(<ChatInput />);

    const textarea = screen.getByRole('textbox', { name: 'Câu hỏi' });
    fireEvent.change(textarea, { target: { value: 'What is LoRA?' } });
    expect(textarea).toHaveValue('What is LoRA?');

    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });
    expect(send).toHaveBeenCalledWith('What is LoRA?');
  });

  it('does not send on Shift+Enter', () => {
    const send = vi.fn();
    useRag.setState({ send });
    render(<ChatInput />);

    const textarea = screen.getByRole('textbox', { name: 'Câu hỏi' });
    fireEvent.change(textarea, { target: { value: 'Line 1' } });
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(send).not.toHaveBeenCalled();
  });

  it('shows Stop button when running and triggers stop', () => {
    const stop = vi.fn();
    useRag.setState({ phase: 'generating', stop });
    render(<ChatInput />);

    const stopBtn = screen.getByRole('button', { name: 'Dừng' });
    expect(stopBtn).toBeDefined();
    fireEvent.click(stopBtn);
    expect(stop).toHaveBeenCalled();
  });
});

describe('PipelineStatus', () => {
  it('returns null when idle', () => {
    useRag.setState({ visualPhase: 'idle', phase: 'idle' });
    const { container } = render(<PipelineStatus />);
    expect(container.firstChild).toBeNull();
  });

  it('renders active steps and skip animation button when running', () => {
    const skipAnimation = vi.fn();
    useRag.setState({
      visualPhase: 'flying',
      phase: 'generating',
      skipAnimation,
      current: { timings: null, error: null } as any,
    });
    render(<PipelineStatus />);

    expect(screen.getByTestId('pipeline-status')).toBeDefined();
    const skipBtn = screen.getByRole('button', { name: /Bỏ qua animation/i });
    fireEvent.click(skipBtn);
    expect(skipAnimation).toHaveBeenCalled();
  });

  it('renders timings when done', () => {
    useRag.setState({
      visualPhase: 'done',
      phase: 'done',
      current: {
        timings: { embed_ms: 10, route_ms: 20, search_ms: 30, rerank_ms: 40, llm_ms: 50, total_ms: 150 },
        error: null,
      } as any,
    });
    render(<PipelineStatus />);
    expect(screen.getByText('150ms')).toBeDefined();
  });

  it('shows error message when failed', () => {
    useRag.setState({
      visualPhase: 'error',
      phase: 'error',
      current: { error: 'Connection refused', timings: null } as any,
    });
    render(<PipelineStatus />);
    expect(screen.getByText(/Connection refused/)).toBeDefined();
  });
});

describe('MessageBubble & MessageList', () => {
  it('renders user message with expandedTerms', () => {
    render(
      <MessageBubble
        message={{ id: 'u1', role: 'user', content: 'Hello world', runId: 1, status: 'done' }}
        expandedTerms={['lora', 'peft']}
      />,
    );
    expect(screen.getByText('Hello world')).toBeDefined();
    expect(screen.getByText('+ lora')).toBeDefined();
    expect(screen.getByText('+ peft')).toBeDefined();
  });

  it('renders assistant message with streaming state', () => {
    render(<MessageBubble message={{ id: 'a1', role: 'assistant', content: 'Streaming text...', runId: 1, status: 'streaming' }} />);
    expect(screen.getByText('Streaming text...')).toBeDefined();
    expect(screen.getByTestId('assistant-message').getAttribute('data-status')).toBe('streaming');
  });

  it('renders assistant message with error and stopped state', () => {
    const { rerender } = render(
      <MessageBubble
        message={{ id: 'a1', role: 'assistant', content: '', runId: 1, status: 'error', error: 'LLM crashed' }}
      />,
    );
    expect(screen.getByRole('alert')).toBeDefined();
    expect(screen.getByText(/LLM crashed/)).toBeDefined();

    rerender(
      <MessageBubble
        message={{ id: 'a1', role: 'assistant', content: 'Partial content', runId: 1, status: 'stopped' }}
      />,
    );
    expect(screen.getByText('Đã dừng')).toBeDefined();
  });

  it('renders assistant message with citation stats and timings when done', () => {
    useRag.setState({ visualPhase: 'done', runId: 1 });
    render(
      <MessageBubble
        message={{
          id: 'a1',
          role: 'assistant',
          content: 'Full answer [1906.00071]',
          runId: 1,
          status: 'done',
          citationChecks: [
            { paper_id: '1906.00071', status: 'verified', claim: 'LoRA works' },
            { paper_id: '1906.99999', status: 'unverified', claim: 'Hallucination' },
          ],
          timings: { total_ms: 450, embed_ms: 50, retrieve_ms: 100, generate_ms: 300 },
        }}
      />,
    );
    expect(screen.getByText(/1 trích dẫn xác minh/)).toBeDefined();
    expect(screen.getByText(/1 ngoài ngữ cảnh/)).toBeDefined();
    expect(screen.getByText('450 ms')).toBeDefined();
  });

  it('renders MessageList with empty state, samples, and messages', () => {
    useRag.setState({ messages: [] });
    const { rerender } = render(<MessageList />);
    expect(screen.getByText(/Hỏi cây tri thức/i)).toBeDefined();

    // Click sample question
    const sampleBtn = screen.getByText('LoRA giúp fine-tune transformer hiệu quả như thế nào?');
    fireEvent.click(sampleBtn);

    // Test onScroll
    useRag.setState({
      runId: 2,
      visualPhase: 'done',
      messages: [
        { id: 'u1', role: 'user', content: 'Question', runId: 1, status: 'done' },
        { id: 'a1', role: 'assistant', content: 'Answer', runId: 1, status: 'done' },
      ],
    });
    rerender(<MessageList />);
    const scroller = screen.getByText('Question').closest('div')!.parentElement!;
    fireEvent.scroll(scroller, { target: { scrollTop: 10 } });
  });
});

describe('ChatPanel & ChatReopenButton', () => {
  it('renders ChatPanel with collapse trigger', () => {
    const onCollapse = vi.fn();
    render(<ChatPanel onCollapse={onCollapse} />);
    expect(screen.getByRole('heading', { name: 'Hỏi đáp RAG' })).toBeDefined();

    const collapseBtn = screen.getByRole('button', { name: 'Thu gọn chat' });
    fireEvent.click(collapseBtn);
    expect(onCollapse).toHaveBeenCalled();
  });

  it('ChatReopenButton opens chat', () => {
    useUi.setState({ chatOpen: false });
    render(<ChatReopenButton />);

    const openBtn = screen.getByRole('button', { name: 'Mở chat' });
    fireEvent.click(openBtn);
    expect(useUi.getState().chatOpen).toBe(true);
  });
});
