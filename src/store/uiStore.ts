import { create } from 'zustand';
import type { CitationCheck, GroundedChunk } from '../types/rag';
import type { Vec3 } from '../types/world';
import type { CameraMode } from '../utils/cameraPresets';
import { vectorPosition } from '../utils/flight';
import { resolveResultCase } from '../utils/resultCase';
import { readJson, writeStorage } from '../utils/storage';
import { useWorld } from './worldStore';

export type QualityMode = 'auto' | 'high' | 'low';
/** 0 = full · 1 = dpr 1 · 2 = cheap bloom · 3 = no post-processing. */
export type QualityTier = 0 | 1 | 2 | 3;

export interface Settings {
  quality: QualityMode;
  top_k: number;
  nprobe: number;
  category: string;
  use_authority_boost: boolean;
  expand_query: boolean;
  reduceMotion: boolean;
  /** Topic labels on the branches (off by default: they clutter the view). */
  showBranchLabels: boolean;
}

/** Which answer a focused paper is judged against (its own message's context). */
export interface FocusContext {
  citationChecks: CitationCheck[];
  grounded: GroundedChunk[];
}

export interface TooltipInfo {
  kind: 'crate' | 'vector';
  /** Crate id or vector index. */
  id: number;
  x: number;
  y: number;
}

export interface HighlightLabel {
  kind: 'crate' | 'category';
  id: number;
  label: string;
}

const SETTINGS_KEY = 'rkt.settings';

function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

export const DEFAULT_SETTINGS: Settings = {
  quality: 'auto',
  top_k: 5,
  nprobe: 2,
  category: '',
  use_authority_boost: true,
  expand_query: false,
  reduceMotion: false,
  showBranchLabels: false,
};

export function validateSettings(s: Partial<Settings>): Partial<Record<keyof Settings, string>> {
  const errors: Partial<Record<keyof Settings, string>> = {};
  if (s.top_k !== undefined && (!Number.isInteger(s.top_k) || s.top_k < 1 || s.top_k > 20)) errors.top_k = 'top_k phải là số nguyên từ 1 đến 20';
  if (s.nprobe !== undefined && (!Number.isInteger(s.nprobe) || s.nprobe < 1 || s.nprobe > 6)) errors.nprobe = 'nprobe phải là số nguyên từ 1 đến 6';
  if (s.quality !== undefined && !['auto', 'high', 'low'].includes(s.quality)) errors.quality = 'Chất lượng không hợp lệ';
  return errors;
}

function isSettings(v: unknown): v is Partial<Settings> {
  return typeof v === 'object' && v !== null;
}

function initialSettings(): Settings {
  const stored = readJson(SETTINGS_KEY, isSettings) ?? {};
  const merged: Settings = { ...DEFAULT_SETTINGS, reduceMotion: prefersReducedMotion(), ...stored };
  return Object.keys(validateSettings(merged)).length ? { ...DEFAULT_SETTINGS, reduceMotion: merged.reduceMotion } : merged;
}

interface UiState {
  cameraMode: CameraMode;
  previousCameraMode: CameraMode;
  cameraTarget: Vec3 | null;
  /** Vector the camera/ResultCard is on; null for papers without a vector. */
  focusedPaperId: string | null;
  /** Paper shown in the right-side PaperPanel. */
  panelPaperId: string | null;
  focusContext: FocusContext | null;
  hoveredVectorIndex: number | null;
  tooltip: TooltipInfo | null;
  highlights: Uint32Array | null;
  highlightLabel: HighlightLabel | null;
  maxYear: number | null;
  settings: Settings;
  /** Current render tier (driven by the quality mode / PerformanceMonitor). */
  qualityTier: QualityTier;
  chatOpen: boolean;
  settingsOpen: boolean;

  setCameraMode: (mode: CameraMode, target?: Vec3 | null) => void;
  focusPaper: (paperId: string, opts?: { openPanel?: boolean; context?: FocusContext | null }) => void;
  openPanel: (paperId: string) => void;
  closeFocus: () => void;
  setHovered: (index: number | null, tooltip: TooltipInfo | null) => void;
  setTooltip: (tooltip: TooltipInfo | null) => void;
  setHighlights: (indices: Uint32Array | null, label: HighlightLabel | null) => void;
  setMaxYear: (y: number | null) => void;
  updateSettings: (patch: Partial<Settings>) => Partial<Record<keyof Settings, string>>;
  resetSettings: () => void;
  setChatOpen: (open: boolean) => void;
  setQualityTier: (tier: QualityTier) => void;
  setSettingsOpen: (open: boolean) => void;
}

export const useUi = create<UiState>((set, get) => ({
  cameraMode: 'overview',
  previousCameraMode: 'overview',
  cameraTarget: null,
  focusedPaperId: null,
  panelPaperId: null,
  focusContext: null,
  hoveredVectorIndex: null,
  tooltip: null,
  highlights: null,
  highlightLabel: null,
  maxYear: null,
  settings: initialSettings(),
  qualityTier: 0,
  chatOpen: true,
  settingsOpen: false,

  setCameraMode: (mode, target) => {
    const s = get();
    set({
      cameraMode: mode,
      cameraTarget: target === undefined ? s.cameraTarget : target,
      previousCameraMode: mode === 'focus' || mode === 'follow' ? s.previousCameraMode : mode,
    });
  },

  focusPaper: (paperId, opts = {}) => {
    const { vectors, vectorIndexByPaperId } = useWorld.getState();
    const context = opts.context === undefined ? get().focusContext : opts.context;
    const kind = context ? resolveResultCase(paperId, context.citationChecks, context.grounded) : 'browse';
    const index = vectorIndexByPaperId.get(paperId);
    const canFly = kind !== 'unverified' && index !== undefined && vectors !== null;
    const s = get();
    set({
      focusContext: context,
      panelPaperId: opts.openPanel === false ? s.panelPaperId : paperId,
      focusedPaperId: canFly ? paperId : null,
      ...(canFly && vectors
        ? {
            cameraMode: 'focus' as const,
            cameraTarget: vectorPosition(vectors, index),
            previousCameraMode: s.cameraMode === 'focus' || s.cameraMode === 'follow' ? s.previousCameraMode : s.cameraMode,
          }
        : {}),
    });
  },
  openPanel: (paperId) => set({ panelPaperId: paperId }),
  closeFocus: () => {
    const s = get();
    set({ panelPaperId: null, focusedPaperId: null, cameraMode: s.cameraMode === 'focus' ? s.previousCameraMode : s.cameraMode });
  },

  setHovered: (index, tooltip) => set({ hoveredVectorIndex: index, tooltip }),
  setTooltip: (tooltip) => set({ tooltip }),
  setHighlights: (indices, label) => set({ highlights: indices, highlightLabel: indices ? label : null }),
  setMaxYear: (maxYear) => set({ maxYear }),

  updateSettings: (patch) => {
    const errors = validateSettings(patch);
    if (Object.keys(errors).length > 0) return errors;
    const settings = { ...get().settings, ...patch };
    writeStorage(SETTINGS_KEY, JSON.stringify(settings));
    set({ settings });
    return {};
  },
  resetSettings: () => {
    const settings = { ...DEFAULT_SETTINGS, reduceMotion: prefersReducedMotion() };
    writeStorage(SETTINGS_KEY, JSON.stringify(settings));
    set({ settings });
  },
  setChatOpen: (chatOpen) => set({ chatOpen }),
  setQualityTier: (qualityTier) => {
    if (get().qualityTier !== qualityTier) set({ qualityTier });
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
}));
