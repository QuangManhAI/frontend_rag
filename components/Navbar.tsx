'use client';

import React from 'react';
import { HealthResponse } from '../src/types/rag';
import { useTheme } from '../src/context/ThemeContext';
import { Cpu, Database, BookOpen, ExternalLink, Activity, Moon, Sun } from 'lucide-react';

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
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--bg)] px-5 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-editorial text-lg font-bold tracking-tight text-[var(--ink)]">
                Scientific Literature
              </span>
              <span className="rounded bg-[var(--accent-light)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--accent)] border border-[var(--accent-border)]">
                RAG 1.0
              </span>
            </div>
            <p className="text-[11px] text-[var(--muted)]">
              Grounded over 913k arXiv chunks · Qwen2.5-7B on GPU
            </p>
          </div>
        </div>

        {/* Telemetry Status Badges & Theme Toggle */}
        <div className="flex items-center gap-2 text-xs font-sans">
          {/* Lakehouse Status */}
          <div className="hidden sm:flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[var(--muted)]">
            <Database className="h-3 w-3 text-[var(--muted)]" />
            <span>LanceDB:</span>
            <span className="font-semibold text-[var(--ink)]">913,205 Chunks</span>
          </div>

          {/* Model Status */}
          <div className="hidden md:flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[var(--muted)]">
            <BookOpen className="h-3 w-3 text-[var(--muted)]" />
            <span>Model:</span>
            <span className="font-semibold text-[var(--ink)]">Qwen2.5-7B</span>
          </div>

          {/* GPU Hardware Status */}
          <div className="flex items-center gap-1.5 rounded border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[var(--muted)]">
            <Cpu className="h-3 w-3 text-[var(--muted)]" />
            <span>GPU:</span>
            {loadingHealth ? (
              <span className="text-[var(--muted)] animate-pulse">Detecting...</span>
            ) : isCuda ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">CUDA (99 Layers)</span>
            ) : isMetal ? (
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">Metal (MPS)</span>
            ) : isOnline ? (
              <span className="font-semibold text-amber-600 dark:text-amber-400">CPU Fallback</span>
            ) : (
              <span className="font-semibold text-red-600 dark:text-red-400">Offline</span>
            )}
          </div>

          {/* Swagger Link */}
          <a
            href="http://localhost:8000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 rounded border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] px-2.5 py-1 text-[var(--muted)] hover:text-[var(--ink)] transition-colors"
          >
            <Activity className="h-3 w-3" />
            <span className="hidden lg:inline">Swagger API</span>
            <ExternalLink className="h-2.5 w-2.5 opacity-70" />
          </a>

          {/* Theme Switcher Button */}
          <button
            type="button"
            onClick={toggleTheme}
            aria-label="Toggle Light and Dark Theme"
            className="flex h-7 w-7 items-center justify-center rounded border border-[var(--border)] bg-[var(--surface)] hover:bg-[var(--surface-raised)] text-[var(--ink)] transition-colors"
            title={theme === 'dark' ? 'Switch to White / Light Theme' : 'Switch to Dark Theme'}
          >
            {theme === 'dark' ? (
              <Sun className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <Moon className="h-3.5 w-3.5 text-slate-700" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
