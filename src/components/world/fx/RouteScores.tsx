import { useFx } from '../../../store/fxStore';
import { useWorld } from '../../../store/worldStore';
import { Anchor } from '../overlay/anchors';

/** Real cosine scores from the `route` event at every candidate fork (chosen highlighted). */
export function RouteScores() {
  const labels = useFx((s) => s.routeLabels);
  const nodesById = useWorld((s) => s.nodesById);
  return (
    <>
      {labels.map((l) => {
        const n = nodesById.get(l.node_id);
        if (!n) return null;
        return (
          <Anchor key={l.node_id} position={[n.position[0], n.position[1] + (n.depth === 1 ? 3.5 : 2.2), n.position[2]]}>
            <div className="score3d" data-chosen={l.chosen} data-testid="route-score">
              {l.score.toFixed(3)}
            </div>
          </Anchor>
        );
      })}
    </>
  );
}
