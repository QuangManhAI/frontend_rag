import type { CSSProperties } from 'react';

/** Delays a shell element's intro animation (`--intro-delay` in index.css). */
export const introDelay = (s: number) => ({ '--intro-delay': `${s}s` }) as CSSProperties;
