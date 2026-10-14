'use client';

import React from 'react';
import { GroundedChunkResult } from '../src/types/rag';
import { X, ExternalLink, BookOpen, User, Layers, Hash } from 'lucide-react';

interface PaperModalProps {
  chunk: GroundedChunkResult | null;
  onClose: () => void;
}

export function PaperModal({ chunk, onClose }: PaperModalProps) {
  if (!chunk) return null;

  const arxivUrl = `https://arxiv.org/abs/${chunk.paper_id}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl p-6 overflow-hidden max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-start gap-3">
            <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-xs font-mono font-semibold text-indigo-300">
                  {chunk.citation_tag}
                </span>
                {chunk.primary_category && (
                  <span className="rounded bg-slate-800 px-2 py-0.5 text-xs text-slate-300">
                    {chunk.primary_category}
                  </span>
                )}
              </div>
              <h2 className="mt-1 text-lg font-bold text-white leading-snug">{chunk.title}</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Metadata badges */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {chunk.authors && chunk.authors.length > 0 && (
              <div className="flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
                <User className="h-4 w-4 text-purple-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Authors</span>
                  <span className="text-slate-200">{chunk.authors.join(', ')}</span>
                </div>
              </div>
            )}

            {chunk.section_title && (
              <div className="flex items-start gap-2 rounded-xl border border-slate-800/80 bg-slate-950/50 p-3">
                <Layers className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="text-slate-400 block font-medium">Source Section</span>
                  <span className="text-slate-200">{chunk.section_title}</span>
                </div>
              </div>
            )}
          </div>

          {/* Scores breakdown */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Grounding & Authority Metrics
            </h3>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                <div className="text-xs text-slate-400">Cosine Similarity (85%)</div>
                <div className="text-base font-bold text-cyan-400 mt-0.5">
                  {(chunk.similarity_score * 100).toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-slate-900 p-2.5 border border-slate-800">
                <div className="text-xs text-slate-400">PageRank Authority (15%)</div>
                <div className="text-base font-bold text-purple-400 mt-0.5">
                  {(chunk.authority_score * 100).toFixed(1)}%
                </div>
              </div>
              <div className="rounded-lg bg-slate-900 p-2.5 border border-indigo-500/30 bg-indigo-500/5">
                <div className="text-xs text-indigo-300 font-medium">Blended RAG Score</div>
                <div className="text-base font-bold text-white mt-0.5">
                  {(chunk.final_score * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          </div>

          {/* Text Content */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-semibold uppercase tracking-wider">Retrieved Text Content</span>
              <span className="flex items-center gap-1 font-mono">
                <Hash className="h-3 w-3" />
                {chunk.chunk_id}
              </span>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans">
              {chunk.text}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-slate-800 pt-4">
          <a
            href={arxivUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            <span>View full paper on arXiv</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}
