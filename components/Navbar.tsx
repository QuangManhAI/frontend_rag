'use client';

import React from 'react';
import { HealthResponse } from '../src/types/rag';
import { Cpu, Database, Sparkles, BookOpen, ExternalLink, Activity } from 'lucide-react';

interface NavbarProps {
  health: HealthResponse | null;
  loadingHealth: boolean;
}

export function Navbar({ health, loadingHealth }: NavbarProps) {
  const isCuda = health?.components?.gpu?.type === 'cuda';
  const isMetal = health?.components?.gpu?.type === 'metal';
  const isOnline = health?.status === 'ok';

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-4 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-white">Scientific RAG Workbench</h1>
              <span className="rounded-full bg-indigo-500/10 px-2 py-0.5 text-xs font-semibold text-indigo-400 border border-indigo-500/20">
                v1.0 TypeScript
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Retrieval-Augmented Generation over 913k Academic Chunks
            </p>
          </div>
        </div>

        {/* Telemetry Status Badges */}
        <div className="flex items-center gap-2 text-xs">
          {/* Lakehouse Status */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300">
            <Database className="h-3.5 w-3.5 text-cyan-400" />
            <span>LanceDB:</span>
            <span className="font-semibold text-white">913,205 Chunks</span>
          </div>

          {/* Model Status */}
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300">
            <BookOpen className="h-3.5 w-3.5 text-purple-400" />
            <span>LLM:</span>
            <span className="font-semibold text-white">Qwen2.5-7B Instruct</span>
          </div>

          {/* GPU Hardware Status */}
          <div className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-1.5 text-slate-300">
            <Cpu className="h-3.5 w-3.5 text-emerald-400" />
            <span>Hardware:</span>
            {loadingHealth ? (
              <span className="text-slate-400 animate-pulse">Detecting...</span>
            ) : isCuda ? (
              <span className="font-semibold text-emerald-400 flex items-center gap-1">
                CUDA (99 Layers)
              </span>
            ) : isMetal ? (
              <span className="font-semibold text-emerald-400">Metal (MPS)</span>
            ) : isOnline ? (
              <span className="font-semibold text-amber-400">CPU Fallback</span>
            ) : (
              <span className="font-semibold text-red-400">Offline</span>
            )}
          </div>

          {/* Swagger Link */}
          <a
            href="http://localhost:8000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 px-3 py-1.5 text-indigo-300 transition-colors"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Swagger API</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>
        </div>
      </div>
    </header>
  );
}
