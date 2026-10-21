/** Canopy points: size attenuation with clamps, twinkle, state boosts, year cut-off. */
export const CANOPY_VERT = /* glsl */ `
  attribute vec3 color;
  attribute float size;
  attribute float phase;
  attribute float state;
  attribute float year;
  attribute float inFilter;
  attribute float born;
  uniform float uFilter;
  uniform float uDimRest;
  uniform float uClock;
  uniform float uFootprint;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform float uMaxYear;
  uniform float uMinPx;
  uniform float uMaxPx;
  uniform float uTwinkle;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vState;
  varying float vFoot;

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    // Frustum & near-plane culling: prune points behind camera plane
    if (mv.z >= -0.1) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vColor = vec3(0.0);
      vAlpha = 0.0;
      vState = 0.0;
      vFoot = 0.0;
      return;
    }

    vec4 clip = projectionMatrix * mv;
    // Guard-band frustum culling: early out if point center is outside screen bounds
    if (abs(clip.x) > clip.w * 1.25 || abs(clip.y) > clip.w * 1.25) {
      gl_Position = vec4(2.0, 2.0, 2.0, 1.0);
      gl_PointSize = 0.0;
      vColor = vec3(0.0);
      vAlpha = 0.0;
      vState = 0.0;
      vFoot = 0.0;
      return;
    }

    // Filter: points outside the active selection are drawn dimmed unless the overlay set a state.
    float st = state;
    if (st < 0.5 && uFilter > 0.5 && inFilter < 0.5) st = 1.0;
    float s = size;
    float alpha = 0.9;
    float boost = 0.0;
    float maxPx = uMaxPx;
    if (st > 0.5 && st < 1.5) { alpha = 0.1; s *= 0.65; }
    // Spotlight after a search (eased 0 → 1): plain points fade back, the found ranks keep their boost.
    else if (st < 0.5) { alpha = mix(0.9, 0.08, uDimRest); s *= mix(1.0, 0.6, uDimRest); }
    else if (st > 1.5 && st < 2.5) { s *= 1.7; boost = 0.45; maxPx *= 1.6; }
    else if (st > 2.5 && st < 3.5) { s *= 2.4; boost = 0.7; maxPx *= 2.2; }
    else if (st > 3.5) { s *= 3.0 * (1.0 + 0.18 * sin(uTime * 4.5)); boost = 0.8; maxPx *= 2.8; }
    // Spotlight: the found ranks grow and brighten further while everything else dims.
    if (st > 1.5) { s *= 1.0 + 0.7 * uDimRest; maxPx *= 1.0 + 0.6 * uDimRest; boost += 0.35 * uDimRest; }
    float tw = 1.0;
    if (uTwinkle > 0.05) tw += uTwinkle * 0.18 * sin(uTime * (1.2 + phase) + phase * 6.2831);
    float px = clamp(s * tw * uScale / -mv.z, uMinPx, maxPx) * uPixelRatio;
    if (year > uMaxYear) { px = 0.0; alpha = 0.0; }
    // Papers added by the live crawl pop in (scale 0 → 1 with a small overshoot) at their birth time.
    if (born > 0.0) {
      float g = clamp((uClock - born) / 0.9, 0.0, 1.0);
      if (g <= 0.0) { px = 0.0; alpha = 0.0; }
      else { px *= g * (1.0 + 0.6 * sin(g * 3.14159)); alpha *= min(1.0, g * 2.0); }
    }
    // Big sprites overlap and saturate when the camera is close: fade them a little.
    if (st < 1.5) alpha *= clamp(10.0 / max(px / uPixelRatio, 1.0), 0.4, 1.0);
    // Halo footprint: the faint tail beyond 80% of the radius is not rasterised (fewer blended
    // fragments into the bloom target); the focused point keeps its full outer ring.
    vFoot = st > 3.5 ? 1.0 : uFootprint;
    gl_PointSize = min(px * vFoot, 48.0 * uPixelRatio);
    gl_Position = clip;
    vColor = mix(color, vec3(1.0), boost * 0.35) * (1.0 + boost);
    vAlpha = alpha;
    vState = st;
  }
`;

export const CANOPY_FRAG = /* glsl */ `
  uniform float uGlow;
  uniform float uAlphaCut;
  uniform vec3 uOutlineColor;
  uniform float uOutline;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vState;
  varying float vFoot;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0 * vFoot;
    if (d > vFoot) discard;
    float core = smoothstep(0.5, 0.05, d);
    float halo = exp(-d * d * 4.5) * uGlow;
    vec3 col = vColor * (core * 1.25 + halo * 0.9);
    float a = (core + halo * 0.55) * vAlpha;
    float ring = smoothstep(0.38, 0.5, d) * (1.0 - smoothstep(0.5, 0.66, d)) * uOutline;
    col = mix(col, uOutlineColor, ring * 0.85);
    a = max(a, ring * vAlpha);
    if (vState > 3.5) {
      float r2 = smoothstep(0.7, 0.8, d) * (1.0 - smoothstep(0.85, 0.95, d));
      col += vColor * r2 * 1.5;
      a = max(a, r2 * 0.9);
    }
    if (a < uAlphaCut) discard;
    gl_FragColor = vec4(col, a);
  }
`;
