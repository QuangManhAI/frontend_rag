'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  ChatMessage,
  GroundedChunkResult,
  QueryOptions,
} from '../src/types/rag';
import {
  Send,
  SlidersHorizontal,
  Bot,
  User,
  Clock,
  BookOpen,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (query: string, options: QueryOptions) => void;
  isLoading: boolean;
  onCitationClick: (paperId: string) => void;
  onSelectChunk?: (chunk: GroundedChunkResult) => void;
}

const SAMPLE_QUERIES = [
  'How does LoRA optimize large models?',
  'What are the key differences between Transformer self-attention and convolutional networks?',
  'Explain parameter-efficient fine-tuning techniques for vision transformers.',
  'How does contrastive learning prevent representation collapse in self-supervised learning?',
];

const CATEGORIES = [
  { label: 'All Disciplines', value: '' },
  { label: 'Machine Learning (cs.LG)', value: 'cs.LG' },
  { label: 'Computer Vision (cs.CV)', value: 'cs.CV' },
  { label: 'Computation & Language (cs.CL)', value: 'cs.CL' },
  { label: 'Statistics (stat.ML)', value: 'stat.ML' },
];

function preprocessLatex(content: string): string {
  if (!content) return '';

  return content
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$\n${math.trim()}\n$$`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`)
    .replace(/(^|[^\\$])\(\s*([A-Za-z0-9_\\^+\-*=<>~ ]*\\(?:in|mathbb|Delta|times|mu|sigma|theta|alpha|beta|gamma|lambda|sum|prod|leq|geq|ll|gg|approx|neq|subset)[^()]*?)\s*\)/g, 
      (match, prefix, math) => `${prefix}$${math.trim()}$`
    );
}

export function ChatPanel({
  messages,
  onSendMessage,
  isLoading,
  onCitationClick,
}: ChatPanelProps) {
  const [input, setInput] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const [options, setOptions] = useState<QueryOptions>({
    top_k: 5,
    category: '',
    use_authority_boost: true,
    expand_query: false,
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!input.trim() || isLoading) return;
    onSendMessage(input.trim(), options);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[var(--bg)] transition-colors overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col justify-center min-h-[65vh] max-w-2xl mx-auto px-4 py-8">
            {/* Editorial Headline Statement */}
            <div className="space-y-3">
              <h2 className="font-editorial text-3xl sm:text-4xl font-bold text-[var(--ink)] leading-tight tracking-tight">
                Academic Research, Grounded.
              </h2>
              <p className="text-base text-[var(--muted)] leading-relaxed max-w-xl">
                Synthesis across 913,205 peer-reviewed computer science and machine learning papers. Powered by dense LanceDB retrieval, co-authorship PageRank, and local Qwen2.5-7B inference.
              </p>
            </div>

            {/* Inquiries */}
            <div className="mt-8 pt-6 border-t border-[var(--border)] space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
                Selected Research Inquiries
              </span>
              <div className="grid grid-cols-1 gap-2.5">
                {SAMPLE_QUERIES.map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(sample)}
                    className="group flex items-center justify-between rounded border border-[var(--border)] bg-[var(--surface)] p-3 text-xs text-[var(--ink-secondary)] hover:border-[var(--ink)] hover:text-[var(--ink)] transition-all text-left"
                  >
                    <span>{sample}</span>
                    <ArrowRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity text-[var(--accent)] shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar Icon */}
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-xs font-bold ${
                    isUser
                      ? 'bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--ink)]'
                      : 'bg-[var(--accent)] text-[var(--accent-ink)]'
                  }`}
                >
                  {isUser ? <User className="h-3.5 w-3.5" /> : <Bot className="h-3.5 w-3.5" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative rounded-lg p-4 sm:p-5 text-sm leading-relaxed max-w-2xl ${
                    isUser
                      ? 'bg-[var(--surface-raised)] text-[var(--ink)] border border-[var(--border)]'
                      : 'bg-[var(--surface)] border border-[var(--border)] text-[var(--ink)]'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans text-sm font-medium">{msg.content}</div>
                  ) : (
                    <div className="prose dark:prose-invert prose-sm max-w-none space-y-3 font-sans text-[var(--ink)]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
                        rehypePlugins={[[rehypeKatex, { output: 'htmlAndMathml', throwOnError: false }]]}
                        components={{
                          code({ className, children, ...props }) {
                            const text = String(children);
                            const match = text.match(/\[Paper:\s*([^\]]+)\]/);
                            if (match && match[1]) {
                              const paperId = match[1].trim();
                              return (
                                <button
                                  type="button"
                                  onClick={() => onCitationClick(paperId)}
                                  className="inline-flex items-center gap-1 mx-1 px-1.5 py-0.5 rounded font-mono text-xs font-semibold bg-[var(--accent-light)] text-[var(--accent)] border border-[var(--accent-border)] hover:opacity-85 transition-opacity align-baseline"
                                >
                                  <BookOpen className="h-3 w-3" />
                                  <span>{paperId}</span>
                                </button>
                              );
                            }
                            return (
                              <code className={className} {...props}>
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {preprocessLatex(msg.content)}
                      </ReactMarkdown>
                    </div>
                  )}

                  {/* Telemetry Footer */}
                  {!isUser && (
                    <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-[var(--border)] pt-2 text-[11px] text-[var(--muted)]">
                      {msg.latency_ms && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-[var(--muted)]" />
                          {(msg.latency_ms / 1000).toFixed(2)}s
                        </span>
                      )}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span>Cited:</span>
                          {msg.citations.map((c) => (
                            <button
                              key={c}
                              onClick={() => onCitationClick(c)}
                              className="rounded border border-[var(--border)] bg-[var(--bg)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--accent)] hover:border-[var(--accent)] transition-colors"
                            >
                              {c}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 max-w-xl mr-auto items-start">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[var(--accent)] text-[var(--accent-ink)]">
              <Bot className="h-3.5 w-3.5 animate-spin" />
            </div>
            <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-3.5 text-xs text-[var(--muted)] space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[var(--accent)] animate-ping" />
                <span className="text-[var(--ink)] font-medium">
                  Retrieving Chunks & Synthesizing Answer...
                </span>
              </div>
              <p className="text-[11px] text-[var(--muted)]">
                Local Qwen2.5-7B offloaded to GPU with strict academic citation constraints.
              </p>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Control Bar & Input Area */}
      <div className="border-t border-[var(--border)] bg-[var(--bg)] p-4 transition-colors">
        <div className="max-w-3xl mx-auto space-y-3">
          {/* Options Drawer */}
          {showOptions && (
            <div className="rounded border border-[var(--border)] bg-[var(--surface)] p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between border-b border-[var(--border)] pb-2">
                <span className="font-semibold text-[var(--ink)] flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent)]" />
                  Retrieval & Synthesis Parameters
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setOptions({
                      top_k: 5,
                      category: '',
                      use_authority_boost: true,
                      expand_query: false,
                    })
                  }
                  className="text-[var(--muted)] hover:text-[var(--ink)] flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {/* Top K */}
                <div>
                  <div className="flex justify-between text-[var(--ink)] mb-1">
                    <span>Grounded Chunks:</span>
                    <span className="font-mono text-[var(--accent)] font-bold">{options.top_k}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={options.top_k}
                    onChange={(e) =>
                      setOptions({ ...options, top_k: parseInt(e.target.value) })
                    }
                    className="w-full accent-[var(--accent)] cursor-pointer"
                  />
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-[var(--ink)] mb-1">arXiv Discipline:</label>
                  <select
                    value={options.category || ''}
                    onChange={(e) =>
                      setOptions({ ...options, category: e.target.value || undefined })
                    }
                    className="w-full rounded border border-[var(--border)] bg-[var(--bg)] px-2 py-1 text-[var(--ink)] outline-none focus:border-[var(--accent)]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* PageRank Boost */}
                <div className="flex items-center gap-2 pt-3">
                  <input
                    type="checkbox"
                    id="author_boost"
                    checked={options.use_authority_boost}
                    onChange={(e) =>
                      setOptions({ ...options, use_authority_boost: e.target.checked })
                    }
                    className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <label htmlFor="author_boost" className="text-[var(--ink)] cursor-pointer select-none">
                    PageRank Boost (15%)
                  </label>
                </div>

                {/* Query Expansion */}
                <div className="flex items-center gap-2 pt-3">
                  <input
                    type="checkbox"
                    id="rule_expansion"
                    checked={options.expand_query}
                    onChange={(e) =>
                      setOptions({ ...options, expand_query: e.target.checked })
                    }
                    className="rounded border-[var(--border)] text-[var(--accent)] focus:ring-[var(--accent)]"
                  />
                  <label htmlFor="rule_expansion" className="text-[var(--ink)] cursor-pointer select-none">
                    FP-Growth Expansion
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <div className="relative flex-1 rounded border border-[var(--border)] bg-[var(--surface)] focus-within:border-[var(--ink)] transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a scientific research question..."
                rows={1}
                className="w-full resize-none bg-transparent px-3.5 py-3 text-sm text-[var(--ink)] placeholder:text-[var(--muted)] focus:outline-none min-h-[46px] max-h-32 font-sans"
              />
            </div>

            {/* Options Toggle */}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded border transition-all ${
                showOptions
                  ? 'border-[var(--accent)] bg-[var(--accent-light)] text-[var(--accent)]'
                  : 'border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--surface-raised)]'
              }`}
              title="Tune Pipeline Hyperparameters"
            >
              <SlidersHorizontal className="h-4 w-4" />
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded bg-[var(--accent)] hover:opacity-90 disabled:opacity-50 text-[var(--accent-ink)] transition-all"
              title="Execute RAG Query"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
