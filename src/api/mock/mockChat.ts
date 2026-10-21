import type { CompareCandidate, GroundedChunk, PipelineTimings, RagRequest, RagStreamEvent, RouteStep } from '../../types/rag';
import type { Chunk, PaperDetail, SectionType, WorldData } from '../../types/world';
import { MOCK_CATEGORY_DEFS } from './mockWorld';
import { hashString, mulberry32, pick } from './rng';

/** A world plus the paper_id → vector index lookup the mock needs. */
export interface MockContext {
  world: WorldData;
  indexByPaperId: ReadonlyMap<string, number>;
}

/** One scripted SSE event and the delay before it is emitted. */
export interface ScriptedEvent {
  delayMs: number;
  event: RagStreamEvent;
}

export function buildIndex(ids: readonly string[]): Map<string, number> {
  const m = new Map<string, number>();
  ids.forEach((id, i) => m.set(id, i));
  return m;
}

// ---------------------------------------------------------------- papers

const ACRONYMS = ['LUMA', 'KORA', 'VEXT', 'NOVA', 'TRIDENT', 'ORBIT', 'SAGE', 'HELIX', 'QUILL', 'ARBOR', 'MOSAIC', 'LYRA'];
const TEMPLATES = [
  (a: string, w1: string, w2: string) => `${a}: ${cap(w1)}-Aware ${cap(w2)} at Scale`,
  (_: string, w1: string, w2: string) => `Rethinking ${cap(w1)} in ${cap(w2)}`,
  (_: string, w1: string, w2: string) => `Towards Robust ${cap(w1)} via ${cap(w2)}`,
  (a: string, w1: string, w2: string) => `${a}: Efficient ${cap(w1)} with ${cap(w2)}`,
  (_: string, w1: string, w2: string) => `On the Limits of ${cap(w1)} for ${cap(w2)}`,
  (_: string, w1: string, w2: string) => `Learning ${cap(w1)} from ${cap(w2)} Signals`,
];
const FIRST = ['Minh', 'Lan', 'Quang', 'Hà', 'Wei', 'Sofia', 'Arjun', 'Elena', 'Kenji', 'Amara', 'Lucas', 'Yuki', 'Tuấn', 'Mai', 'Omar', 'Clara'];
const LAST = ['Nguyễn', 'Trần', 'Phạm', 'Chen', 'Rossi', 'Patel', 'Müller', 'Tanaka', 'Okafor', 'Silva', 'Kim', 'Lê', 'Dubois', 'Novak'];
const SECTIONS: ReadonlyArray<readonly [SectionType, string]> = [
  ['abstract', 'Abstract'],
  ['introduction', '1 Introduction'],
  ['method', '3 Method'],
  ['experiment', '4 Experiments'],
  ['discussion', '5 Discussion'],
  ['other', 'Appendix A'],
];

function cap(s: string): string {
  return s.replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, c: string) => sep + c.toUpperCase());
}

function wordsOf(category: number): readonly string[] {
  return MOCK_CATEGORY_DEFS[category]?.words ?? ['representation', 'retrieval'];
}

export function mockPaperTitle(paperId: string, category: number): string {
  const rng = mulberry32(hashString(paperId));
  const words = wordsOf(category);
  const w1 = pick(rng, words);
  let w2 = pick(rng, words);
  if (w2 === w1) w2 = words[(words.indexOf(w1) + 1) % words.length];
  return pick(rng, TEMPLATES)(pick(rng, ACRONYMS), w1, w2);
}

/** Deterministic PaperDetail for any paper of the mock world; unknown id → null. */
export function mockPaperDetail(ctx: MockContext, paperId: string): PaperDetail | null {
  const index = ctx.indexByPaperId.get(paperId);
  if (index === undefined) return null;
  const v = ctx.world.vectors;
  return buildMockPaper(paperId, v.categories[index], v.years[index], v.flags[index] === 1);
}

/** Deterministic PaperDetail from metadata (also used for papers added by the mock crawler). */
export function buildMockPaper(paperId: string, category: number, year: number, hasFull: boolean): PaperDetail {
  const rng = mulberry32(hashString(paperId) ^ 0x5bd1e995);
  const title = mockPaperTitle(paperId, category);
  const words = wordsOf(category);
  const authors = Array.from({ length: 2 + Math.floor(rng() * 5) }, () => `${pick(rng, FIRST)} ${pick(rng, LAST)}`);
  const [w1, w2, w3] = [pick(rng, words), pick(rng, words), pick(rng, words)];
  const gain = (2 + rng() * 9).toFixed(1);
  const abstract =
    `We study **${w1}** in the context of ${w2}. Existing approaches treat the two independently, which limits transfer. ` +
    `We propose a unified objective that couples them through a shared latent space $z \\in \\mathbb{R}^{d}$, and show ` +
    `consistent gains of ${gain}% over strong baselines on ${2 + Math.floor(rng() * 4)} benchmarks, with particular robustness under ${w3}.`;
  const sections = hasFull ? SECTIONS : SECTIONS.slice(0, 5);
  const chunks: Chunk[] = sections.map(([type, sectionTitle], k) => ({
    chunk_id: `${paperId}::c${k}`,
    section_type: type,
    section_title: sectionTitle,
    text: chunkText(type, w1, w2, w3, gain, abstract),
  }));
  return { paper_id: paperId, title, authors, category_index: category, year, abstract, has_fulltext: hasFull, chunks };
}

function chunkText(type: SectionType, w1: string, w2: string, w3: string, gain: string, abstract: string): string {
  switch (type) {
    case 'abstract':
      return abstract;
    case 'introduction':
      return `Recent progress in ${w2} has made ${w1} a central design question. However, most pipelines still rely on heuristics that break under distribution shift. Our key observation is that ${w3} provides a cheap supervisory signal that can be exploited at training time.`;
    case 'method':
      return `Given an input $x$ and context set $\\mathcal{C}$, we minimise\n$$\\mathcal{L}(\\theta) = \\mathbb{E}_{(x,y)}\\big[-\\log p_\\theta(y \\mid x, \\mathcal{C})\\big] + \\lambda \\lVert \\theta \\rVert_2^2$$\nwhere $\\lambda$ controls regularisation. The ${w1} module is parameterised by a low-rank update $W = W_0 + BA$ with rank $r \\ll d$.`;
    case 'experiment':
      return `On all benchmarks our method improves the strongest baseline by ${gain}% on average. Ablations show that removing the ${w3} term costs most of the gain, while the ${w2} encoder can be swapped with little effect.`;
    case 'discussion':
      return `Limitations: our analysis assumes access to clean ${w2} labels. Extending ${w1} to noisy or adversarial settings is left for future work.`;
    case 'other':
      return `Additional hyper-parameters: learning rate $3\\times10^{-4}$, batch size 256, cosine schedule, 3 seeds. Full ${w3} statistics are reported in Table 7.`;
  }
}

// ---------------------------------------------------------------- chat script

function affinityCategory(query: string): number {
  const q = query.toLowerCase();
  let best = -1;
  let bestHits = 0;
  MOCK_CATEGORY_DEFS.forEach((c, i) => {
    let hits = q.includes(c.code.toLowerCase()) ? 2 : 0;
    for (const w of c.words) if (q.includes(w)) hits++;
    if (hits > bestHits) {
      bestHits = hits;
      best = i;
    }
  });
  return best >= 0 ? best : hashString(q) % MOCK_CATEGORY_DEFS.length;
}

const round3 = (x: number) => Math.round(x * 1000) / 1000;

/**
 * Full event script for one question, consistent with the mock world:
 * route uses real nodes, compare holds vectors from chosen twigs (score desc),
 * compare holds top_k vectors (one comparing stop each), grounded chunks come from them, citations include one paper NOT in context.
 */
export function buildChatScript(req: RagRequest, ctx: MockContext): ScriptedEvent[] {
  const { world } = ctx;
  const query = req.query.trim();
  const topK = Math.min(20, Math.max(1, req.top_k ?? 5));
  const nprobe = Math.min(6, Math.max(1, req.nprobe ?? 2));
  const boost = req.use_authority_boost ?? true;
  const qh = hashString(query);
  const rng = mulberry32(qh);
  const aff = affinityCategory(query);
  const out: ScriptedEvent[] = [];
  const phaseGap = () => 300 + Math.floor(rng() * 300);

  out.push({ delayMs: 120, event: { type: 'phase', phase: 'embedding' } });
  if (query.includes('/error')) {
    out.push({ delayMs: 700, event: { type: 'error', message: 'Mock: máy chủ LLM đang quá tải (lỗi giả lập để test).', status: 503 } });
    return out;
  }

  // Route: depth 1 over all branches, depth 2 over twigs of the chosen branches (top nprobe per branch).
  const branches = world.tree.filter((n) => n.depth === 1);
  const d1 = branches
    .map((b) => ({ node_id: b.id, score: round3(0.38 + (b.dominant_category === aff ? 0.3 : 0) + rng() * 0.22) }))
    .sort((a, b) => b.score - a.score);
  const chosen1 = d1.slice(0, Math.min(nprobe, d1.length)).map((c) => c.node_id);
  const d2: { node_id: number; score: number }[] = [];
  const chosen2: number[] = [];
  for (const b of chosen1) {
    const own = world.tree
      .filter((n) => n.parent_id === b)
      .map((t) => ({ node_id: t.id, score: round3(0.45 + (t.dominant_category === aff ? 0.26 : 0) + rng() * 0.2) }))
      .sort((a, c) => c.score - a.score);
    d2.push(...own);
    chosen2.push(...own.slice(0, nprobe).map((c) => c.node_id));
  }
  d2.sort((a, b) => b.score - a.score);
  const steps: RouteStep[] = [
    { depth: 1, candidates: d1, chosen: chosen1 },
    { depth: 2, candidates: d2, chosen: chosen2 },
  ];
  out.push({ delayMs: phaseGap(), event: { type: 'phase', phase: 'flying' } });
  out.push({ delayMs: 40, event: { type: 'route', steps } });

  // Compare: best vectors inside the chosen twigs.
  const twigSet = new Set(chosen2);
  const categoryFilter = req.category ? world.categories.find((c) => c.code === req.category)?.index : undefined;
  const v = world.vectors;
  const pool: { i: number; s: number }[] = [];
  for (let i = 0; i < v.count; i++) {
    if (!twigSet.has(v.twigIds[i])) continue;
    if (categoryFilter !== undefined && v.categories[i] !== categoryFilter) continue;
    const h = mulberry32(qh ^ (i * 2654435761))();
    pool.push({ i, s: 0.46 + (v.categories[i] === aff ? 0.2 : 0) + h * 0.3 });
  }
  pool.sort((a, b) => b.s - a.s);
  const compare: CompareCandidate[] = pool.slice(0, topK).map((p) => ({ paper_id: world.vectorIds[p.i], score: round3(Math.min(0.97, p.s)) }));
  out.push({ delayMs: phaseGap(), event: { type: 'phase', phase: 'comparing' } });
  out.push({ delayMs: 40, event: { type: 'compare', candidates: compare } });

  // Retrieval: top_k of compare, the best paper contributes a second chunk.
  const grounded: GroundedChunk[] = [];
  compare.slice(0, topK).forEach((c, rank) => {
    const paper = mockPaperDetail(ctx, c.paper_id);
    const index = ctx.indexByPaperId.get(c.paper_id);
    if (!paper || index === undefined) return;
    const authority = round3(v.authority[index]);
    const picks = rank === 0 && topK > 1 ? [2, 3] : [1 + (hashString(c.paper_id) % 2)];
    picks.forEach((k, j) => {
      const ch = paper.chunks[k];
      const sim = round3(c.score - j * 0.04);
      grounded.push({
        chunk_id: ch.chunk_id, paper_id: paper.paper_id, title: paper.title, section_title: ch.section_title, section_type: ch.section_type,
        text: ch.text, similarity_score: sim, authority_score: authority, final_score: round3(boost ? 0.8 * sim + 0.2 * authority : sim),
        citation_tag: `[Paper: ${paper.paper_id}]`,
      });
    });
  });
  const expanded = req.expand_query ? [...wordsOf(aff)].slice(0, 3).map((w) => `${w} retrieval`) : undefined;
  out.push({ delayMs: phaseGap(), event: { type: 'phase', phase: 'found' } });
  out.push({ delayMs: 40, event: { type: 'retrieval', grounded_chunks: grounded, ...(expanded ? { expanded_terms: expanded } : {}) } });

  // Answer tokens.
  const papers = [...new Map(grounded.map((g) => [g.paper_id, g])).values()];
  const cited = papers.slice(0, Math.min(3, papers.length)).map((p) => p.paper_id);
  let fake = '2412.99999';
  while (ctx.indexByPaperId.has(fake)) fake = `${fake}9`;
  const answer = composeAnswer(query, aff, papers.map((p) => p.title), cited, fake, topK);
  out.push({ delayMs: phaseGap(), event: { type: 'phase', phase: 'generating' } });
  for (const piece of answer.match(/[\s\S]{1,5}/g) ?? []) out.push({ delayMs: 25, event: { type: 'token', text: piece } });

  const timings: PipelineTimings = {
    embed_ms: 18 + Math.floor(rng() * 20),
    route_ms: 2 + Math.floor(rng() * 4),
    search_ms: 30 + Math.floor(rng() * 40),
    rerank_ms: 8 + Math.floor(rng() * 15),
    llm_ms: 1800 + Math.floor(rng() * 1500),
    total_ms: 0,
  };
  timings.total_ms = timings.embed_ms + timings.route_ms + timings.search_ms + timings.rerank_ms + timings.llm_ms;
  out.push({ delayMs: 80, event: { type: 'done', citations: [...cited, fake], timings } });
  return out;
}

function composeAnswer(query: string, aff: number, titles: string[], cited: string[], fake: string, k: number): string {
  const cat = MOCK_CATEGORY_DEFS[aff];
  const [a, b, c] = cited;
  const lines = [
    `**Tóm tắt.** Dựa trên ${k} đoạn văn truy xuất được, câu hỏi “${query}” rơi chủ yếu vào nhóm *${cat.name}* (\`${cat.code}\`).`,
    '',
    `1. **${titles[0] ?? 'Bài báo hàng đầu'}** đề xuất ghép ${cat.words[0]} với ${cat.words[1]} trong một hàm mục tiêu chung, và đạt kết quả tốt nhất trong nhóm ứng viên [Paper: ${a}].`,
  ];
  if (b) lines.push(`2. Hướng tiếp cận bổ sung đến từ **${titles[1]}**${c ? ` và **${titles[2]}**` : ''}, tập trung vào độ bền khi dữ liệu thay đổi phân phối [Paper: ${c ? `${b}, ${c}` : b}].`);
  lines.push(`3. Một số kết quả cũ hơn cũng hay được nhắc tới [Paper: ${fake}].`);
  lines.push(
    '',
    'Về hình thức, mục tiêu huấn luyện thường có dạng',
    '',
    '$$\\mathcal{L}(\\theta) = -\\sum_{i=1}^{N} \\log p_\\theta\\left(y_i \\mid x_i, \\mathcal{C}_k\\right)$$',
    '',
    `trong đó $\\mathcal{C}_k$ là ngữ cảnh gồm $k = ${k}$ đoạn văn đã truy xuất, xếp hạng theo $s = 0.8\\,\\cos(q, d) + 0.2\\,\\text{PR}(d)$.`,
    '',
    '> Đây là câu trả lời **giả lập** (mock) để test giao diện; trích dẫn cuối cùng cố ý không nằm trong ngữ cảnh.',
  );
  return lines.join('\n');
}
