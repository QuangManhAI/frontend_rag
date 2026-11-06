/** LOD level = number of ascending thresholds the distance exceeds (0 = closest). */
export function lodLevel(distance: number, thresholds: readonly number[]): number {
  let level = 0;
  for (const t of thresholds) {
    if (distance > t) level++;
    else break;
  }
  return level;
}
