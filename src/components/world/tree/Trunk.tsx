import type * as THREE from 'three';
import { buildTrunkGeometry } from '../../../utils/treeGeometry';

export const TRUNK_HEIGHT = 35;
export const TRUNK_BASE_RADIUS = 4.2;
export const TRUNK_TOP_RADIUS = 2.1;

/** Gnarled trunk geometry (merged with the branches into one mesh by <Branches>). */
export function buildTrunk(): THREE.BufferGeometry {
  return buildTrunkGeometry({ height: TRUNK_HEIGHT, baseRadius: TRUNK_BASE_RADIUS, topRadius: TRUNK_TOP_RADIUS, color: [1, 1, 1] });
}
