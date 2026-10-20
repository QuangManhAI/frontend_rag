import { memo, useEffect, useRef, useState, startTransition, type ComponentProps } from 'react';
import ReactMarkdown, { type Components, type ExtraProps } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import type { CitationCheck } from '../../types/rag';
import type { FocusContext } from '../../store/uiStore';
import { remarkCitations } from '../../utils/remarkCitations';
import { CitationChip, type ChipStatus } from './CitationChip';

interface Props {
  text: string;
  /** Known checks; ids without a check yet render as "pending" (still streaming). */
  checks?: readonly CitationCheck[];
  context?: FocusContext | null;
  className?: string;
  streaming?: boolean;
}

/**
 * LLM math ➔ remark-math: `\[…\]` ➔ `$$…$$`, `\(…\)` ➔ `$…$` (Qwen often writes these), and a
 * line that is only `$$…$$` becomes block math (remark-math reads one-line `$$` as inline).
 */
export function normalizeDisplayMath(text: string): string {
  return text
    .replace(/\\\[([\s\S]+?)\\\]/g, (_m, body: string) => `$$${body}$$`)
    .replace(/\\\(([\s\S]+?)\\\)/g, (_m, body: string) => `$${body.trim()}$`)
    .replace(/^[ \t]*\$\$([^\n]+?)\$\$[ \t]*$/gm, (_m, body: string) => `$$\n${body}\n$$`);
}

/**
 * Throttles text parsing during active streaming to prevent KaTeX and ReactMarkdown
 * from monopolizing the main thread and causing 3D animation lag spikes.
 */
function useThrottledStreamingText(text: string, streaming: boolean, delayMs = 60): string {
  const [renderedText, setRenderedText] = useState(text);
  const lastUpdateRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!streaming) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setRenderedText(text);
      return;
    }

    const now = performance.now();
    const elapsed = now - lastUpdateRef.current;

    if (elapsed >= delayMs) {
      lastUpdateRef.current = now;
      startTransition(() => {
        setRenderedText(text);
      });
    } else {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        lastUpdateRef.current = performance.now();
        startTransition(() => {
          setRenderedText(text);
        });
      }, delayMs - elapsed);
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, streaming, delayMs]);

  return streaming ? renderedText : text;
}

/** Markdown + KaTeX renderer; never injects raw HTML (react-markdown escapes it). */
export const Markdown = memo(function Markdown({ text, checks = [], context = null, className = '', streaming = false }: Props) {
  const displayText = useThrottledStreamingText(text, streaming);

  const components: Components = {
    cite: (props: ComponentProps<'cite'> & ExtraProps) => {
      const paperId = (props as Record<string, unknown>)['data-paper-id'];
      if (typeof paperId !== 'string') return <cite>{props.children}</cite>;
      const status: ChipStatus = checks.find((c) => c.paper_id === paperId)?.status ?? 'pending';
      return <CitationChip paperId={paperId} status={status} context={context} />;
    },
    a: ({ href, children }) => (
      <a href={href} target="_blank" rel="noreferrer noopener">
        {children}
      </a>
    ),
  };

  return (
    <div className={`md ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkCitations]} rehypePlugins={[rehypeKatex]} components={components}>
        {normalizeDisplayMath(displayText)}
      </ReactMarkdown>
    </div>
  );
});
