import type { CitationCheck, GroundedChunk } from '../types/rag';

export type ResultCase = 'grounded' | 'browse' | 'unverified';

/** Which of the three PaperPanel cases applies to a paper. */
export function resolveResultCase(
  paperId: string,
  citationChecks: readonly CitationCheck[],
  groundedChunks: readonly GroundedChunk[],
): ResultCase {
  if (groundedChunks.some((c) => c.paper_id === paperId)) return 'grounded';
  if (citationChecks.some((c) => c.paper_id === paperId && c.status === 'unverified')) return 'unverified';
  return 'browse';
}

/** Grounded chunks grouped by paper, best final_score first. */
export interface GroundedPaper {
  paper_id: string;
  title: string;
  best: GroundedChunk;
  chunks: GroundedChunk[];
}

export function groupGroundedByPaper(chunks: readonly GroundedChunk[]): GroundedPaper[] {
  const byId = new Map<string, GroundedPaper>();
  for (const c of chunks) {
    const g = byId.get(c.paper_id);
    if (!g) byId.set(c.paper_id, { paper_id: c.paper_id, title: c.title, best: c, chunks: [c] });
    else {
      g.chunks.push(c);
      if (c.final_score > g.best.final_score) g.best = c;
    }
  }
  return [...byId.values()].sort((a, b) => b.best.final_score - a.best.final_score);
}
