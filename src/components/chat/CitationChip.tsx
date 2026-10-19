import { useId } from 'react';
import { useUi, type FocusContext } from '../../store/uiStore';
import { useWorld } from '../../store/worldStore';
import { useTheme } from '../../theme/useTheme';
import { categoryColor } from '../../theme/tokens';

export type ChipStatus = 'verified' | 'unverified' | 'pending';

interface Props {
  paperId: string;
  status: ChipStatus;
  context: FocusContext | null;
}

export const UNVERIFIED_TIP = 'Bài này không nằm trong ngữ cảnh đã truy xuất';

export function CitationChip({ paperId, status, context }: Props) {
  const theme = useTheme();
  const tipId = useId();
  const index = useWorld((s) => s.vectorIndexByPaperId.get(paperId));
  const category = useWorld((s) => (index !== undefined && s.vectors ? s.vectors.categories[index] : -1));
  const color = categoryColor(category, theme);
  const unverified = status === 'unverified';
  return (
    <button
      type="button"
      className="cite-chip"
      data-status={status}
      data-paper-id={paperId}
      aria-label={`Trích dẫn ${paperId}${unverified ? ' (chưa xác minh)' : ''}`}
      aria-describedby={unverified ? tipId : undefined}
      onClick={() => useUi.getState().focusPaper(paperId, { context })}
    >
      <span className="dot" style={{ background: color, color, width: '0.45rem', height: '0.45rem' }} aria-hidden />
      {paperId}
      {unverified && (
        <span className="cite-tip" role="tooltip" id={tipId}>
          ⚠ {UNVERIFIED_TIP}
        </span>
      )}
    </button>
  );
}
