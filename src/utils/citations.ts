export type AnswerPart = { kind: 'text'; value: string } | { kind: 'citation'; paperId: string };

const CITATION_RE = /\[Paper:\s*([^\]]+)\]/g;

/** Split an answer into text and citation parts; `[Paper: a, b]` yields two citations. */
export function splitCitations(answer: string): AnswerPart[] {
  const parts: AnswerPart[] = [];
  let last = 0;
  for (const m of answer.matchAll(CITATION_RE)) {
    const at = m.index ?? 0;
    if (at > last) parts.push({ kind: 'text', value: answer.slice(last, at) });
    for (const id of m[1].split(',')) {
      const paperId = id.trim();
      if (paperId) parts.push({ kind: 'citation', paperId });
    }
    last = at + m[0].length;
  }
  if (last < answer.length) parts.push({ kind: 'text', value: answer.slice(last) });
  return parts.filter((p) => p.kind === 'citation' || p.value.length > 0);
}
