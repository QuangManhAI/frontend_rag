import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { flightProbe, useFx, type BranchMark, type RouteLabel, type TopKItem } from '../../../store/fxStore';
import { PHASE_ORDER, phaseIndex } from '../../../store/pipeline';
import { useRag } from '../../../store/ragStore';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import type { PipelinePhase } from '../../../types/rag';
import type { Vec3 } from '../../../types/world';
import { animationConfig as cfg } from '../../../utils/animationConfig';
import { VectorState } from '../../../utils/canopy';
import {
  buildCompareTour,
  buildFlightPaths,
  compareDwell,
  easeInOut,
  lerp3,
  polylineLength,
  QUERY_ORIGIN,
  samplePolyline,
  vectorPosition,
  type TourStop,
} from '../../../utils/flight';
import { groupGroundedByPaper } from '../../../utils/resultCase';
import { CompareThreads, type CompareThreadsHandle } from './CompareThreads';
import { EssenceFlow } from './EssenceFlow';
import { QueryOrb } from './QueryOrb';
import { QueryText } from './QueryText';
import { TopKThreads } from './TopKThreads';

const MAX_ORBS = 12;
/** Canopy dimming while the orb searches (1 = full spotlight once the ranks are found). */
const SEARCH_DIM = 0.9;
const CANOPY_CENTER: Vec3 = [0, 80, 0];

type Plan =
  | { kind: 'embedding' }
  | { kind: 'flying'; paths: Vec3[][]; duration: number; forkAt: number }
  | { kind: 'comparing'; stops: TourStop[]; hovers: Vec3[]; slots: { start: number; travel: number; end: number }[]; from: Vec3 }
  | { kind: 'found'; topK: TopKItem[]; anchor: Vec3; from: Vec3 }
  | { kind: 'generating' }
  | { kind: 'done' };

interface Runtime {
  stage: PipelinePhase;
  t: number;
  done: boolean;
  instant: boolean;
  plan: Plan | null;
  orbPos: Vec3;
  orbScale: number;
  forked: boolean;
  slot: number;
  /** Last stage whose plan was applied; used to catch up on stages skipped over. */
  handled: PipelinePhase;
}

const fresh = (): Runtime => ({ stage: 'idle', t: 0, done: false, instant: false, plan: null, orbPos: QUERY_ORIGIN, orbScale: 0, forked: false, slot: -1, handled: 'idle' });

/** Hover point just outside a vector so the orb never covers it. */
function hoverPoint(p: Vec3): Vec3 {
  const d: Vec3 = [p[0] - CANOPY_CENTER[0], 0, p[2] - CANOPY_CENTER[2]];
  const n = Math.hypot(d[0], d[2]) || 1;
  return [p[0] + (d[0] / n) * 2.2, p[1] + 1.4, p[2] + (d[2] / n) * 2.2];
}

/** Has the data for this stage arrived (or has the backend moved past it without sending any)? */
function stageData(stage: PipelinePhase): boolean {
  const { phase, current } = useRag.getState();
  const past = phaseIndex(phase) > phaseIndex(stage) || phase === 'error';
  if (stage === 'flying') return current.route.length > 0 || past;
  if (stage === 'comparing') return current.compare.length > 0 || past;
  if (stage === 'found') return current.grounded_chunks.length > 0 || past;
  return true;
}

function routeFinal(): void {
  const { route } = useRag.getState().current;
  const nodes = useWorld.getState().nodesById;
  const marks = new Map<number, BranchMark>();
  const labels: RouteLabel[] = [];
  for (const step of route) {
    const chosen = new Set(step.chosen);
    for (const c of step.candidates) {
      // Depth-2 candidates are only shown under the chosen branches.
      if (step.depth === 2 && !route.some((s) => s.depth === 1 && s.chosen.includes(nodes.get(c.node_id)?.parent_id ?? -1))) continue;
      marks.set(c.node_id, chosen.has(c.node_id) ? 1 : 2);
      labels.push({ node_id: c.node_id, score: c.score, chosen: chosen.has(c.node_id) });
    }
  }
  useFx.getState().setBranchMarks(marks);
  useFx.getState().setRouteLabels(labels);
}

function routeDepth1(): void {
  const step = useRag.getState().current.route.find((s) => s.depth === 1);
  if (!step) return;
  const chosen = new Set(step.chosen);
  const marks = new Map<number, BranchMark>(step.candidates.map((c) => [c.node_id, chosen.has(c.node_id) ? 1 : 2]));
  useFx.getState().setBranchMarks(marks);
  useFx.getState().setRouteLabels(step.candidates.map((c) => ({ node_id: c.node_id, score: c.score, chosen: chosen.has(c.node_id) })));
}

function buildPlan(stage: PipelinePhase, from: Vec3): Plan | null {
  if (!stageData(stage)) return null;
  const { current } = useRag.getState();
  const world = useWorld.getState();
  const vectors = world.vectors;
  switch (stage) {
    case 'embedding':
      return { kind: 'embedding' };
    case 'flying': {
      const paths = buildFlightPaths(current.route, world.nodesById).slice(0, MAX_ORBS);
      const longest = Math.max(1, ...paths.map(polylineLength));
      const duration = Math.min(cfg.flightMax, Math.max(cfg.flightMin, longest / cfg.flightSpeed));
      const first = paths[0];
      const forkAt = first && first.length > 3 ? polylineLength(first.slice(0, 3)) / polylineLength(first) : 0.6;
      return { kind: 'flying', paths, duration, forkAt };
    }
    case 'comparing': {
      if (!vectors) return { kind: 'comparing', stops: [], hovers: [], slots: [], from };
      const stops = buildCompareTour(current.compare, vectors, world.vectorIndexByPaperId);
      const hovers = stops.map((s) => hoverPoint(s.position));
      let t = 0;
      const slots = stops.map((_, i) => {
        const d = compareDwell(i, stops.length, cfg.compareFirstDwell, cfg.compareLastDwell);
        const slot = { start: t, travel: t + d * cfg.compareTravelShare, end: t + d };
        t += d;
        return slot;
      });
      return { kind: 'comparing', stops, hovers, slots, from };
    }
    case 'found': {
      const papers = groupGroundedByPaper(current.grounded_chunks);
      const topK: TopKItem[] = [];
      papers.forEach((p, rank) => {
        const index = world.vectorIndexByPaperId.get(p.paper_id);
        if (index === undefined) {
          console.warn(`[flight] grounded paper ${p.paper_id} has no vector — skipped`);
          return;
        }
        topK.push({ paper_id: p.paper_id, index, rank: rank + 1, final_score: p.best.final_score, chunkCount: p.chunks.length });
      });
      const best = topK[0];
      const anchor: Vec3 = best && vectors ? (() => {
        const h = hoverPoint(vectorPosition(vectors, best.index));
        return [h[0], h[1] + 3.2, h[2]] as Vec3;
      })() : from;
      return { kind: 'found', topK, anchor, from };
    }
    case 'generating':
      return { kind: 'generating' };
    case 'done':
      return { kind: 'done' };
    default:
      return null;
  }
}

/** Drives the whole query animation from visualPhase; refs + useFrame only, no per-frame React state. */
export function QueryFlight() {
  const runId = useRag((s) => s.runId);
  const visual = useRag((s) => s.visualPhase);
  const skipToken = useRag((s) => s.skipToken);
  const query = useRag((s) => s.current.query);
  const orbs = useRef<(THREE.Group | null)[]>([]);
  const compare = useRef<CompareThreadsHandle>(null);
  const rt = useRef<Runtime>(fresh());

  const setOrb = (i: number, p: Vec3 | null, scale = 1) => {
    const g = orbs.current[i];
    if (!g) return;
    if (!p || scale <= 0.001) {
      g.visible = false;
      return;
    }
    g.visible = true;
    g.position.set(p[0], p[1], p[2]);
    g.scale.setScalar(scale);
  };
  const hideAll = () => orbs.current.forEach((_, i) => setOrb(i, null));

  // New question → wipe every effect of the previous one.
  useEffect(() => {
    useFx.getState().reset();
    flightProbe.active = false;
    compare.current?.hide();
    rt.current = fresh();
    hideAll();
  }, [runId]);

  // Entering a visual stage.
  useEffect(() => {
    const r = rt.current;
    const rag = useRag.getState();
    r.stage = visual;
    r.t = 0;
    r.done = false;
    r.plan = null;
    r.slot = -1;
    r.instant = rag.skipped || useUi.getState().settings.reduceMotion;
    const ui = useUi.getState();
    if (visual === 'embedding') {
      ui.setCameraMode('canopy');
      r.orbPos = QUERY_ORIGIN;
    } else if (visual === 'flying' || visual === 'comparing') {
      useFx.getState().setDim(SEARCH_DIM);
      flightProbe.active = true;
      flightProbe.position = [...r.orbPos];
      ui.setCameraMode('follow', r.orbPos);
    } else if ((visual === 'generating' || visual === 'done') && useFx.getState().topK.length > 0 && useFx.getState().dim < 1) {
      // The best result has been framed: pull back to the starting view and spotlight the ranks.
      // Its card would sit on top of the rank cluster from there, so it closes (the answer's
      // citation chips reopen any paper).
      flightProbe.active = false;
      if (ui.cameraMode === 'focus' || ui.cameraMode === 'follow' || ui.cameraMode === 'canopy') ui.setCameraMode('overview');
      if (ui.panelPaperId === null) useUi.setState({ focusedPaperId: null });
      useFx.getState().setDim(1);
    } else if (visual === 'error') {
      flightProbe.active = false;
      compare.current?.hide();
      hideAll();
      useFx.getState().reset();
      if (ui.cameraMode === 'follow') ui.setCameraMode('canopy');
    }
  }, [visual, runId]);

  // "Bỏ qua animation": finish the current stage now; later stages show instantly.
  useEffect(() => {
    if (skipToken === 0) return;
    rt.current.instant = true;
  }, [skipToken]);

  const applyFinal = (r: Runtime) => {
    const plan = r.plan;
    if (!plan) return;
    switch (plan.kind) {
      case 'embedding':
        r.orbScale = 1;
        setOrb(0, QUERY_ORIGIN, 1);
        break;
      case 'flying':
        routeFinal();
        plan.paths.forEach((p, i) => setOrb(i, p[p.length - 1], plan.paths.length > 1 ? 0.65 : 1));
        if (plan.paths[0]) r.orbPos = plan.paths[0][plan.paths[0].length - 1];
        flightProbe.position = [...r.orbPos];
        break;
      case 'comparing': {
        compare.current?.hide();
        const entries = plan.stops.map((s) => [s.index, VectorState.comparing] as const);
        useFx.getState().setOverlay(new Map(entries));
        if (plan.hovers.length > 0) r.orbPos = plan.hovers[plan.hovers.length - 1];
        for (let i = 1; i < MAX_ORBS; i++) setOrb(i, null);
        setOrb(0, r.orbPos, 1);
        flightProbe.position = [...r.orbPos];
        break;
      }
      case 'found':
        r.orbPos = plan.anchor;
        setOrb(0, plan.anchor, 1);
        break;
      default:
        break;
    }
  };

  // Called once when a stage's data is in hand.
  const onPlan = (r: Runtime) => {
    const plan = r.plan;
    if (!plan) return;
    const fx = useFx.getState();
    const rag = useRag.getState();
    if (plan.kind !== 'embedding' && rag.current.route.length > 0 && fx.branchMarks.size === 0) routeFinal();
    switch (plan.kind) {
      case 'flying':
        routeDepth1();
        r.forked = false;
        break;
      case 'comparing':
        fx.setRouteLabels([]);
        compare.current?.hide();
        break;
      case 'found': {
        compare.current?.hide();
        fx.setRouteLabels([]);
        fx.setFound(plan.topK, plan.anchor);
        const overlay = new Map<number, number>();
        plan.topK.forEach((t, i) => overlay.set(t.index, i === 0 ? VectorState.focused : VectorState.topK));
        fx.setOverlay(overlay);
        const vec = useWorld.getState();
        fx.setPulsingCrates(new Set(plan.topK.map((t) => vec.vectors?.crateIds[t.index] ?? -1).filter((c) => c >= 0)));
        flightProbe.active = false;
        if (plan.topK[0]) {
          useUi.getState().focusPaper(plan.topK[0].paper_id, {
            openPanel: false,
            context: { citationChecks: rag.current.citationChecks, grounded: rag.current.grounded_chunks },
          });
          // Frame the best result from outside the canopy (the close "focus" shot dives through
          // branches and is too busy mid-search); the view pulls back to the overview afterwards.
          if (useUi.getState().cameraMode === 'focus') useUi.getState().setCameraMode('follow', plan.anchor);
        }
        break;
      }
      case 'done': {
        const checks = rag.current.citationChecks;
        const cited = new Set(checks.filter((c) => c.status === 'verified').map((c) => c.paper_id));
        const overlay = new Map<number, number>();
        fx.topK.forEach((t, i) => overlay.set(t.index, i === 0 && cited.has(t.paper_id) ? VectorState.focused : cited.has(t.paper_id) ? VectorState.topK : VectorState.comparing));
        if (fx.topK[0] && !cited.has(fx.topK[0].paper_id)) overlay.set(fx.topK[0].index, VectorState.focused);
        fx.setOverlay(overlay);
        const vec = useWorld.getState().vectors;
        fx.setPulsingCrates(new Set(fx.topK.filter((t) => cited.has(t.paper_id)).map((t) => vec?.crateIds[t.index] ?? -1).filter((c) => c >= 0)));
        // Citations are known now: refresh the context the ResultCard / PaperPanel judge against.
        useUi.setState({ focusContext: { citationChecks: checks, grounded: rag.current.grounded_chunks } });
        r.orbScale = 0.6;
        break;
      }
      default:
        break;
    }
    if (r.instant) {
      applyFinal(r);
      r.done = true;
    }
  };

  useFrame((state, dt) => {
    const r = rt.current;
    const time = state.clock.elapsedTime;
    const breathe = 1 + 0.09 * Math.sin((time * Math.PI * 2) / cfg.breathe); // trig-ok: scalar oscillation, rotor measured slower/off-phase (trig-audit §3)
    if (r.stage === 'idle' || r.stage === 'error') return;

    if (!r.plan) {
      const plan = buildPlan(r.stage, r.orbPos);
      if (!plan) {
        // Waiting for data: the orb hovers and breathes.
        setOrb(0, r.orbPos, Math.max(0.3, r.orbScale) * breathe);
        return;
      }
      // Skip/jumps can leap over stages: apply their final state first, in order.
      const instant = r.instant;
      for (let i = phaseIndex(r.handled) + 1; i < phaseIndex(r.stage); i++) {
        const skipped = buildPlan(PHASE_ORDER[i], r.orbPos);
        if (!skipped) continue;
        r.plan = skipped;
        r.instant = true;
        onPlan(r);
      }
      r.instant = instant;
      r.done = false;
      r.plan = plan;
      r.handled = r.stage;
      onPlan(r);
    }
    r.t += dt;
    const plan = r.plan;

    if (!r.done) {
      if (r.instant) {
        applyFinal(r);
        r.done = true;
      } else {
        switch (plan.kind) {
          case 'embedding': {
            const grow = easeInOut((r.t - cfg.embedding * 0.45) / (cfg.embedding * 0.45));
            r.orbScale = grow;
            setOrb(0, QUERY_ORIGIN, grow * breathe);
            if (r.t >= cfg.embedding) r.done = true;
            break;
          }
          case 'flying': {
            const p = Math.min(1, r.t / plan.duration);
            const e = easeInOut(p);
            plan.paths.forEach((path, i) => setOrb(i, samplePolyline(path, e), plan.paths.length > 1 && e > plan.forkAt * 0.5 ? 0.65 : 1));
            if (plan.paths[0]) {
              r.orbPos = samplePolyline(plan.paths[0], e);
              flightProbe.position = [...r.orbPos];
            }
            if (!r.forked && e >= plan.forkAt) {
              r.forked = true;
              routeFinal();
            }
            if (p >= 1) r.done = true;
            break;
          }
          case 'comparing': {
            // Extra orbs from a split flight merge back into the main one.
            for (let i = 1; i < MAX_ORBS; i++) {
              const g = orbs.current[i];
              if (g?.visible) {
                const s = g.scale.x * Math.max(0, 1 - dt * 4);
                setOrb(i, [g.position.x, g.position.y, g.position.z], s < 0.05 ? 0 : s);
              }
            }
            const n = plan.stops.length;
            const total = n > 0 ? plan.slots[n - 1].end : 0;
            if (n === 0 || r.t >= total) {
              r.done = true;
              break;
            }
            let k = plan.slots.findIndex((s) => r.t < s.end);
            if (k < 0) k = n - 1;
            const slot = plan.slots[k];
            const prev = k === 0 ? plan.from : plan.hovers[k - 1];
            const travel = Math.min(1, (r.t - slot.start) / Math.max(1e-3, slot.travel - slot.start));
            r.orbPos = lerp3(prev, plan.hovers[k], easeInOut(travel));
            setOrb(0, r.orbPos, 1);
            flightProbe.position = [...r.orbPos];
            if (travel >= 1 && r.slot < k) {
              r.slot = k;
              const stop = plan.stops[k];
              useFx.getState().patchOverlay([[stop.index, VectorState.comparing]]);
              compare.current?.show(r.orbPos, stop.position, stop.score);
            } else compare.current?.follow(r.orbPos);
            break;
          }
          case 'found': {
            const p = easeInOut(r.t / (cfg.found * 0.5));
            r.orbPos = lerp3(plan.from, plan.anchor, p);
            setOrb(0, r.orbPos, 1);
            if (r.t >= cfg.found) r.done = true;
            break;
          }
          case 'generating':
            setOrb(0, r.orbPos, breathe);
            if (r.t >= cfg.generatingMin) r.done = true;
            break;
          case 'done':
            r.done = true;
            break;
        }
        if (r.done) applyFinal(r);
      }
    } else {
      setOrb(0, r.orbPos, (r.stage === 'done' ? 0.6 : 1) * breathe);
    }

    if (r.done && r.stage !== 'done') {
      const rag = useRag.getState();
      const hold = r.instant ? (useUi.getState().settings.reduceMotion ? cfg.reducedHold : 0.12) : 0;
      if (rag.runId === runId && r.t >= hold && phaseIndex(rag.phase) > phaseIndex(rag.visualPhase)) rag.advanceVisual();
    }
  });

  const showText = visual === 'embedding' && query.length > 0;
  return (
    <group>
      {Array.from({ length: MAX_ORBS }, (_, i) => (
        <QueryOrb key={i} size={i === 0 ? 1 : 0.8} ref={(g) => void (orbs.current[i] = g)} />
      ))}
      {showText && <QueryText key={`t${runId}`} text={query} />}
      <CompareThreads ref={compare} />
      <TopKThreads />
      {visual === 'generating' && <EssenceFlow />}
    </group>
  );
}
