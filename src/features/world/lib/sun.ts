import type { Vec3 } from '../../../shared/types/world';

/**
 * Day sun, as a world-space unit direction (from the scene toward the sun).
 * Angled key lighting (~42° elevation, shifted to the side-upper hemisphere): illuminates the tree
 * crown and clouds with natural depth without blinding the user when opening the overview camera.
 * Precomputed unit vector (no runtime trig in TS, FE_DESIGN_SYSTEM §9).
 */
export const SUN_DIR: Vec3 = [0.552, 0.669, -0.497];

/** Key light for the day: same direction as the visible sun (~42° elevation), lighting the crown from above. */
export const DAY_SUN_LIGHT_POSITION: Vec3 = [120, 160, -110];

/** Soft fill light on the opposing side so shadows are never pitch black. */
export const DAY_FILL_LIGHT_POSITION: Vec3 = [-70, 90, 80];
