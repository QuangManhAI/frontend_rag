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
  Sparkles,
  BookOpen,
  HelpCircle,
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
  { label: 'All Fields', value: '' },
  { label: 'Machine Learning (cs.LG)', value: 'cs.LG' },
  { label: 'Computer Vision (cs.CV)', value: 'cs.CV' },
  { label: 'Computation & Language (cs.CL)', value: 'cs.CL' },
  { label: 'Statistics (stat.ML)', value: 'stat.ML' },
];

/**
 * Standardizes raw model LaTeX output delimiters so remark-math & rehype-katex
 * render both inline and block equations reliably.
 * Specifically converts:
 *  - \[ ... \] and $$ ... $$ to $$ ... $$
 *  - \( ... \) and $ ... $ to $ ... $
 */
function preprocessLatex(content: string): string {
  if (!content) return '';

  return content
    // Convert display brackets \[ ... \] to $$ ... $$
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => `$$\n${math.trim()}\n$$`)
    // Convert inline parentheses \( ... \) to $ ... $
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => `$${math.trim()}$`)
    // Protect raw ( W_0 \in \mathbb{R}... ) patterns emitted by some LLMs without backslashes
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
    <div className="flex-1 flex flex-col h-full bg-slate-950 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center max-w-xl mx-auto px-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-4 shadow-xl shadow-indigo-500/5">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Explore 913,205 Scientific Papers
            </h2>
            <p className="mt-2 text-sm text-slate-400 leading-relaxed">
              Ask natural language questions across AI, ML, CV, and NLP. Answers are grounded in the Medallion lakehouse and accelerated with local Qwen2.5-7B on GPU with strict academic citations.
            </p>

            {/* Quick Query Pills */}
            <div className="mt-6 w-full space-y-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 block mb-2">
                Sample Research Questions
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {SAMPLE_QUERIES.map((sample, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setInput(sample);
                    }}
                    className="flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 text-xs text-slate-300 hover:border-indigo-500/50 hover:bg-slate-900 hover:text-white transition-all text-left"
                  >
                    <HelpCircle className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{sample}</span>
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
                className={`flex gap-3 sm:gap-4 max-w-4xl ${
                  isUser ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-xl text-xs font-bold ${
                    isUser
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40 shadow-md shadow-indigo-500/10'
                  }`}
                >
                  {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                </div>

                {/* Message Bubble */}
                <div
                  className={`relative rounded-2xl p-4 sm:p-5 text-sm leading-relaxed max-w-2xl shadow-sm ${
                    isUser
                      ? 'bg-cyan-600 text-white rounded-tr-none'
                      : 'bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  {isUser ? (
                    <div className="whitespace-pre-wrap font-sans">{msg.content}</div>
                  ) : (
                    <div className="prose prose-invert prose-sm max-w-none space-y-3 font-sans">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, [remarkMath, { singleDollarTextMath: true }]]}
                        rehypePlugins={[[rehypeKatex, { output: 'htmlAndMathml', throwOnError: false }]]}
                        components={{
                          code({ className, children, ...props }) {
                            const text = String(children);
                            // Check if this code tag is an academic citation e.g. [Paper: 2106.09685]
                            const match = text.match(/\[Paper:\s*([^\]]+)\]/);
                            if (match && match[1]) {
                              const paperId = match[1].trim();
                              return (
                                <button
                                  type="button"
                                  onClick={() => onCitationClick(paperId)}
                                  className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md font-mono text-xs font-semibold bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/40 transition-colors align-baseline"
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
                    <div className="mt-3.5 flex flex-wrap items-center gap-3 border-t border-slate-800/80 pt-2.5 text-[11px] text-slate-400">
                      {msg.latency_ms && (
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-cyan-400" />
                          {(msg.latency_ms / 1000).toFixed(2)}s
                        </span>
                      )}
                      {msg.citations && msg.citations.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-500">Citations:</span>
                          {msg.citations.map((c) => (
                            <button
                              key={c}
                              onClick={() => onCitationClick(c)}
                              className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-indigo-300 hover:bg-slate-700 transition-colors"
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
          <div className="flex gap-4 max-w-2xl mr-auto items-start">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-600/30 text-indigo-300 border border-indigo-500/40">
              <Bot className="h-4 w-4 animate-spin" />
            </div>
            <div className="rounded-2xl rounded-tl-none border border-slate-800 bg-slate-900/80 p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                <span className="text-slate-200 font-medium">
                  Retrieving from LanceDB & Synthesizing with local Qwen2.5-7B (CUDA)...
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Searching 913k vectors, computing PageRank authority boost, and generating grounded answer.
              </p>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </div>

      {/* Control Bar & Input Area */}
      <div className="border-t border-slate-800 bg-slate-950/90 p-4 backdrop-blur-md">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Options Drawer */}
          {showOptions && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-4 space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-150 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-semibold text-white flex items-center gap-1.5">
                  <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" />
                  RAG Pipeline Parameters
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
                  className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset Defaults
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
                {/* Top K */}
                <div>
                  <div className="flex justify-between text-slate-300 mb-1">
                    <span>Grounded Chunks (Top K):</span>
                    <span className="font-mono text-cyan-400 font-bold">{options.top_k}</span>
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
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-slate-300 mb-1">arXiv Category:</label>
                  <select
                    value={options.category || ''}
                    onChange={(e) =>
                      setOptions({ ...options, category: e.target.value || undefined })
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-1 text-slate-200 outline-none focus:border-indigo-500"
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
                    className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="author_boost" className="text-slate-300 cursor-pointer select-none">
                    PageRank Author Boost (15%)
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
                    className="rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500"
                  />
                  <label htmlFor="rule_expansion" className="text-slate-300 cursor-pointer select-none">
                    FP-Growth Query Expansion
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="relative flex items-end gap-2">
            <div className="relative flex-1 rounded-2xl border border-slate-800 bg-slate-900/90 shadow-lg focus-within:border-indigo-500 transition-colors">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask a scientific research question (e.g., 'How does LoRA optimize large models?')..."
                rows={1}
                className="w-full resize-none bg-transparent px-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none min-h-[48px] max-h-32 font-sans"
              />
            </div>

            {/* Options Toggle */}
            <button
              type="button"
              onClick={() => setShowOptions(!showOptions)}
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border transition-all ${
                showOptions
                  ? 'border-indigo-500 bg-indigo-500/20 text-indigo-300'
                  : 'border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title="Tune Pipeline Hyperparameters"
            >
              <SlidersHorizontal className="h-5 w-5" />
            </button>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white shadow-lg shadow-indigo-600/20 transition-all"
              title="Execute RAG Query"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
