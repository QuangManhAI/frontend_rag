import { useEffect, useState } from 'react';
import { getPaper } from '../../api/client';
import type { PaperDetail } from '../../types/world';

export type PaperState = { status: 'loading' } | { status: 'ready'; paper: PaperDetail } | { status: 'error'; message: string };

/** Loads paper metadata through the cached client; resets when the id changes. */
export function usePaper(paperId: string | null): PaperState | null {
  const [state, setState] = useState<{ id: string; s: PaperState } | null>(null);
  useEffect(() => {
    if (!paperId) return;
    let alive = true;
    setState({ id: paperId, s: { status: 'loading' } });
    getPaper(paperId)
      .then((paper) => alive && setState({ id: paperId, s: { status: 'ready', paper } }))
      .catch((err: Error) => alive && setState({ id: paperId, s: { status: 'error', message: err.message } }));
    return () => {
      alive = false;
    };
  }, [paperId]);
  if (!paperId) return null;
  return state?.id === paperId ? state.s : { status: 'loading' };
}
