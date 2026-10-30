import { CheckCircle2 } from 'lucide-react';
import type { GroundedChunk } from '../../types/rag';
import type { Chunk } from '../../types/world';
import { Markdown } from '../chat/Markdown';
import { ScoreBars } from './ScoreBars';

const SECTION_LABEL: Record<Chunk['section_type'], string> = {
  abstract: 'Tóm tắt',
  introduction: 'Giới thiệu',
  method: 'Phương pháp',
  experiment: 'Thực nghiệm',
  discussion: 'Thảo luận',
  other: 'Khác',
};

/** Paper chunks grouped by section; chunks used as context get a band + their scores. */
export function ChunkList({ chunks, used }: { chunks: Chunk[]; used: GroundedChunk[] }) {
  const usedById = new Map(used.map((u) => [u.chunk_id, u]));
  return (
    <ol className="flex flex-col gap-2.5">
      {chunks.map((c) => {
        const u = usedById.get(c.chunk_id);
        return (
          <li key={c.chunk_id} className={`rounded-md border border-[var(--ui-border)] px-3 py-2 ${u ? 'used-band' : ''}`} data-used={u ? 'true' : 'false'}>
            <div className="flex items-center gap-2 text-caption text-[var(--ink-muted)]">
              <span className="tag">{SECTION_LABEL[c.section_type]}</span>
              <span className="truncate">{c.section_title}</span>
              {u && (
                <span className="ml-auto inline-flex items-center gap-1 text-[var(--success)] font-medium whitespace-nowrap">
                  <CheckCircle2 size={12} /> Đã dùng cho câu trả lời
                </span>
              )}
            </div>
            {u && (
              <div className="mt-2">
                <ScoreBars chunk={u} compact />
              </div>
            )}
            <Markdown text={c.text} className="!text-xs mt-1" />
          </li>
        );
      })}
    </ol>
  );
}
