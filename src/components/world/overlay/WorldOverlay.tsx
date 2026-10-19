import { useRag } from '../../../store/ragStore';
import { useUi } from '../../../store/uiStore';
import { ResultCard } from '../../result/ResultCard';
import { TopKBadges } from '../../result/TopKBadges';
import { QueryTextLabel } from '../fx/QueryText';
import { RouteScores } from '../fx/RouteScores';
import { VectorDigits } from '../fx/VectorDigits';
import { BranchLabels } from '../tree/BranchLabels';
import { CompareScoreLabel } from './CompareScoreLabel';

/** All HTML pinned to 3D positions, in one DOM layer over the canvas (moved by AnchorProjector). */
export function WorldOverlay() {
  const visual = useRag((s) => s.visualPhase);
  const query = useRag((s) => s.current.query);
  const runId = useRag((s) => s.runId);
  const labels = useUi((s) => s.settings.showBranchLabels);
  const embedding = visual === 'embedding' && query.length > 0;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none [&_button]:pointer-events-auto [&_article]:pointer-events-auto z-[1]" data-testid="world-overlay">
      {labels && <BranchLabels />}
      <RouteScores />
      {embedding && <QueryTextLabel key={`q${runId}`} text={query} />}
      {embedding && <VectorDigits key={`d${runId}`} text={query} />}
      <CompareScoreLabel />
      <TopKBadges />
      <ResultCard />
    </div>
  );
}
