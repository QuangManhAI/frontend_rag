'use client';

import React from 'react';
import { GroundedChunkResult } from '../src/types/rag';
import { Layers, ChevronRight, BookOpen, User, Hash, Zap } from 'lucide-react';

interface GroundedInspectorProps {
  chunks: GroundedChunkResult[];
  onSelectChunk: (chunk: GroundedChunkResult) => void;
  selectedChunkId?: string;
  isOpen: boolean;
  onToggle: () => void;
}

export function GroundedInspector({
  chunks,
  onSelectChunk,
  selectedChunkId,
  isOpen,
  onToggle,
}: GroundedInspectorProps) {
  return (
    <aside
      className={`border-l border-slate-800 bg-slate-950/60 transition-all duration-300 flex flex-col ${
        isOpen ? 'w-full lg:w-[420px] xl:w-[460px]' : 'w-12 items-center'
      }`}
    >
      {/* Toggle header */}
      <div className="flex items-center justify-between p-3.5 border-b border-slate-800">
        {isOpen ? (
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Grounded Chunks ({chunks.length})
            </span>
          </div>
        ) : (
          <button
            onClick={onToggle}
            title="Expand Grounded Chunks"
            className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Layers className="h-4 w-4 text-cyan-400" />
          </button>
        )}

        {isOpen && (
          <button
            onClick={onToggle}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Content list */}
      {isOpen && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {chunks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center p-6 text-slate-500">
              <BookOpen className="h-10 w-10 text-slate-700 mb-2 stroke-1" />
              <p className="text-sm font-medium">No chunks loaded yet</p>
              <p className="text-xs text-slate-600 mt-1">
                Execute a RAG query to inspect the top-k grounded chunks retrieved from LanceDB.
              </p>
            </div>
          ) : (
            chunks.map((chunk, idx) => {
              const isSelected = selectedChunkId === chunk.chunk_id;
              return (
                <div
                  key={chunk.chunk_id}
                  onClick={() => onSelectChunk(chunk)}
                  className={`group relative rounded-xl border p-3.5 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                      : 'border-slate-800 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded bg-indigo-500/20 px-2 py-0.5 font-mono text-[11px] font-semibold text-indigo-300">
                        {chunk.citation_tag}
                      </span>
                      <span className="text-slate-500 text-[11px]">#{idx + 1}</span>
                    </div>
                    <span className="flex items-center gap-1 rounded-full bg-slate-800 px-2 py-0.5 font-mono text-[11px] font-bold text-cyan-400">
                      <Zap className="h-3 w-3 text-cyan-400" />
                      {(chunk.final_score * 100).toFixed(1)}%
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-xs font-semibold text-white line-clamp-2 leading-snug group-hover:text-indigo-300 transition-colors">
                    {chunk.title}
                  </h4>

                  {/* Section Title */}
                  {chunk.section_title && (
                    <div className="mt-1 text-[11px] text-slate-400 truncate">
                      § {chunk.section_title}
                    </div>
                  )}

                  {/* Authors snippet */}
                  {chunk.authors && chunk.authors.length > 0 && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-500 truncate">
                      <User className="h-3 w-3 shrink-0" />
                      <span className="truncate">{chunk.authors.slice(0, 3).join(', ')}</span>
                    </div>
                  )}

                  {/* Snippet text */}
                  <p className="mt-2 text-xs text-slate-300 line-clamp-3 leading-relaxed border-t border-slate-800/80 pt-2 font-sans">
                    {chunk.text}
                  </p>

                  {/* Score breakdown metrics bar */}
                  <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 border-t border-slate-800/80 pt-2">
                    <span>Sim: {(chunk.similarity_score * 100).toFixed(1)}%</span>
                    <span>PageRank: {(chunk.authority_score * 100).toFixed(1)}%</span>
                    <span className="font-mono text-slate-500 flex items-center gap-0.5">
                      <Hash className="h-2.5 w-2.5" />
                      {chunk.chunk_id.split('_').slice(-1)[0]}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </aside>
  );
}
