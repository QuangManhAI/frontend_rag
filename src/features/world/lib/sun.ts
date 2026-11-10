import type { Vec3 } from '../../../shared/types/world';

/**
 * Day sun, as a world-space unit direction (from the scene toward the sun).
 * The default overview camera sits at +x·0.5, +z·0.87 and looks 30° down, so the horizon is above the
 * frame; the world floats in an all-around sky, so the sun is placed a little below eye level, behind
 * the canopy, where it peeks out past the crown's right edge in the overview and swings in and out of
 * view as the tree is orbited. Azimuth −100.5° (x = cos, z = sin), 10° below the horizon; precomputed
 * unit vector (no trig in TS, FE_DESIGN_SYSTEM §9).
 */
export const SUN_DIR: Vec3 = [-0.179, -0.174, -0.968];

/** Key light for the day: same azimuth as the visible sun, lifted to ~45° so the crown is lit from above. */
export const DAY_SUN_LIGHT_POSITION: Vec3 = [-30, 160, -160];

/** Soft front fill (the old key light) so the side facing the default camera is never in shade. */
export const DAY_FILL_LIGHT_POSITION: Vec3 = [90, 170, 70];
