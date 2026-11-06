const ARXIV_ID = /^(\d{4})\.(\d{4,5})(v\d+)?$/;

/** arXiv abstract URL for new-style ids (YYMM.NNNN[N][vN]); anything else → null. */
export function toArxivUrl(paperId: string): string | null {
  const id = paperId.trim().replace(/^arxiv:/i, '');
  const m = ARXIV_ID.exec(id);
  if (!m) return null;
  const month = Number(m[1].slice(2));
  if (month < 1 || month > 12) return null;
  return `https://arxiv.org/abs/${id}`;
}
