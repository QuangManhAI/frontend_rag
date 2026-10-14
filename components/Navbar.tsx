'use client';

import React from 'react';
import { HealthResponse } from '../src/types/rag';
import { useTheme } from '../src/context/ThemeContext';
import { Cpu, Database, Sparkles, BookOpen, ExternalLink, Activity, Moon, Sun } from 'lucide-react';

interface NavbarProps {
  health: HealthResponse | null;
  loadingHealth: boolean;
}

export function Navbar({ health, loadingHealth }: NavbarProps) {
  const { theme, toggleTheme } = useTheme();
  const isCuda = health?.components?.gpu?.type === 'cuda';
  const isMetal = health?.components?.gpu?.type === 'metal';
  const isOnline = health?.status === 'ok';

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)]/90 backdrop-blur-md px-4 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] text-[var(--ink)] shadow-sm">
            <Sparkles className="h-5 w-5 text-indigo-500" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-[var(--ink)]">
                Scientific RAG Workbench
              </h1>
              <span className="rounded-full bg-[var(--accent-light)] px-2 py-0.5 text-xs font-semibold text-[var(--accent)] border border-[var(--accent-border)]">
                v1.0 TS
              </span>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Grounded retrieval over 913k Academic Chunks
            </p>
          </div>
        </div>

        {/* Telemetry Status Badges & Theme Toggle */}
        <div className="flex items-center gap-2 text-xs">
          {/* Lakehouse Status */}
          <div className="hidden sm:flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[var(--muted)]">
            <Database className="h-3.5 w-3.5 text-cyan-500" />
            <span>LanceDB:</span>
            <span className="font-semibold text-[var(--ink)]">913,205 Chunks</span>
          </div>

          {/* Model Status */}
          <div className="hidden md:flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[var(--muted)]">
            <BookOpen className="h-3.5 w-3.5 text-purple-500" />
            <span>LLM:</span>
            <span className="font-semibold text-[var(--ink)]">Qwen2.5-7B</span>
          </div>

          {/* GPU Hardware Status */}
          <div className="flex items-center gap-1.5 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[var(--muted)]">
            <Cpu className="h-3.5 w-3.5 text-emerald-500" />
            <span>Hardware:</span>
            {loadingHealth ? (
              <span className="text-[var(--muted)] animate-pulse">Detecting...</span>
            ) : isCuda ? (
              <span className="font-semibold text-emerald-500">CUDA (99 Layers)</span>
            ) : isMetal ? (
              <span className="font-semibold text-emerald-500">Metal (MPS)</span>
            ) : isOnline ? (
              <span className="font-semibold text-amber-500">CPU Fallback</span>
            ) : (
              <span className="font-semibold text-red-500">Offline</span>
            )}
          </div>

          {/* Swagger Link */}
          <a
            href="http://localhost:8000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] px-3 py-1.5 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <Activity className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Swagger API</span>
            <ExternalLink className="h-3 w-3 opacity-70" />
          </a>

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Light and Dark Theme"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--ink)] transition-colors"
            title={theme === 'dark' ? 'Switch to White / Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-amber-400" />
            ) : (
              <Moon className="h-4 w-4 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
