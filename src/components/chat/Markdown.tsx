import { memo, type ComponentProps } from 'react';
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

/** Markdown + KaTeX renderer; never injects raw HTML (react-markdown escapes it). */
export const Markdown = memo(function Markdown({ text, checks = [], context = null, className = '' }: Props) {
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
        {normalizeDisplayMath(text)}
      </ReactMarkdown>
    </div>
  );
});
