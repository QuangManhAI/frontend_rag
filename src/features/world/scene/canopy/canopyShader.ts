/**
 * Canopy points: size attenuation with clamps, twinkle, state boosts, year cut-off.
 * Dark theme: glowing dots (additive). Light theme (`uFlower` = 1): each point is a five-petal flower
 * in its category color, turned by its `phase` so neighbours don't line up.
 */
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
  uniform float uSizeMul;
  uniform float uFlower;
  uniform vec3 uSunDir;
  uniform float uSunGlow;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vState;
  varying float vFoot;
  varying float vPhase;
  varying float vGlint;
  varying vec3 vSunV;
  varying float vBack;

  void main() {
    vPhase = phase;
    vGlint = 0.0;
    vSunV = vec3(0.0, 0.0, 1.0);
    vBack = 0.0;
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
    float s = size * uSizeMul;
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
    // Flowers: each one catches the sun now and then (a brief star glint, ~5% of the time, own rhythm).
    if (uFlower > 0.5 && uTwinkle > 0.05) {
      float w = sin(uTime * (0.6 + fract(phase * 7.31) * 1.7) + phase * 97.0);
      vGlint = pow(max(w, 0.0), 48.0) * uTwinkle;
      tw += vGlint * 0.3;
    }
    float px = clamp(s * tw * uScale / -mv.z, uMinPx, maxPx) * uPixelRatio;
    if (year > uMaxYear) { px = 0.0; alpha = 0.0; }
    // Papers added by the live crawl pop in (scale 0 → 1 with a small overshoot) at their birth time.
    if (born > 0.0) {
      float g = clamp((uClock - born) / 0.9, 0.0, 1.0);
      if (g <= 0.0) { px = 0.0; alpha = 0.0; }
      else { px *= g * (1.0 + 0.6 * sin(g * 3.14159)); alpha *= min(1.0, g * 2.0); }
    }
    // Big glow sprites overlap and saturate when the camera is close: fade them a little (flowers stay opaque).
    if (st < 1.5 && uFlower < 0.5) alpha *= clamp(10.0 / max(px / uPixelRatio, 1.0), 0.4, 1.0);
    // Halo footprint: the faint tail beyond 80% of the radius is not rasterised (fewer blended
    // fragments into the bloom target); the focused point keeps its full outer ring.
    // Sunlight (flowers): the sun's direction in view space drives the petal highlight, and looking
    // toward the sun lights the petals from behind (translucency), so the crown brightens as it is orbited.
    if (uFlower > 0.5) {
      vSunV = normalize((viewMatrix * vec4(uSunDir, 0.0)).xyz);
      vec3 toPoint = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
      vBack = pow(max(dot(toPoint, uSunDir), 0.0), 5.0) * uSunGlow;
    }
    vFoot = st > 3.5 ? 1.0 : uFootprint;
    gl_PointSize = min(px * vFoot, 48.0 * uPixelRatio);
    gl_Position = clip;
    // Glow dots brighten toward white when ranked; flowers keep their petal color and only grow.
    float lift = boost * (1.0 - uFlower);
    vColor = mix(color, vec3(1.0), lift * 0.35) * (1.0 + lift);
    vAlpha = alpha;
    vState = st;
  }
`;

export const CANOPY_FRAG = /* glsl */ `
  uniform float uGlow;
  uniform float uAlphaCut;
  uniform vec3 uOutlineColor;
  uniform float uOutline;
  uniform float uFlower;
  uniform vec3 uPistil;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vState;
  varying float vFoot;
  varying float vPhase;
  varying float vGlint;
  varying vec3 vSunV;
  varying float vBack;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    if (uFlower > 0.5) {
      // Five-petal flower filling the sprite: petal edge r(a) = 0.42 + 0.56 * |cos(2.5 a)|^0.7.
      float r = length(c) * 2.0;
      if (r > 1.0) discard;
      float a = atan(c.y, c.x) + vPhase * 6.2831;
      float petal = pow(abs(cos(2.5 * a)), 0.7);
      float edge = 0.42 + 0.56 * petal;
      float aa = fwidth(r) * 1.2 + 0.02;
      float body = 1.0 - smoothstep(edge - aa, edge, r);
      // Petal shading: lighter toward the tip, a faint darker vein along each petal's spine.
      vec3 col = vColor * (0.78 + 0.32 * smoothstep(0.15, edge, r));
      col *= 1.0 - 0.18 * petal * smoothstep(0.2, 0.9, r) * (1.0 - smoothstep(0.9, 1.0, petal));
      // Gloss: treat each petal as a shallow satin dome lit by the sun from the upper left
      // (gl_PointCoord's y points down), Blinn-Phong highlight + soft diffuse falloff.
      vec2 q = c * 2.0;
      float rr = clamp(r / edge, 0.0, 1.0);
      vec3 n = normalize(vec3(q * 0.85, sqrt(1.0 - rr * rr) + 0.3));
      // Light comes from the real sun (view space; gl_PointCoord's y points down). When the sun is behind
      // the flower it still grazes the dome from its side, weaker.
      float front = clamp(vSunV.z, 0.0, 1.0);
      vec3 sunL = normalize(vec3(vSunV.x, -vSunV.y, max(vSunV.z, 0.2)));
      float spec = pow(max(dot(n, normalize(sunL + vec3(0.0, 0.0, 1.0))), 0.0), 26.0) * (0.45 + 0.75 * front);
      col *= 0.8 + 0.32 * max(dot(n, sunL), 0.0);
      col += vec3(1.0) * spec * 0.6;
      // Back-lit petals: light passing through them glows warm, strongest on the thin edges.
      col += (vColor * 0.7 + vec3(0.32, 0.28, 0.18)) * vBack * (0.55 + 0.8 * smoothstep(0.55, 1.0, rr));
      float pistil = 1.0 - smoothstep(0.14, 0.14 + aa, r);
      col = mix(col, uPistil * (1.0 + 0.5 * spec), pistil);
      // Sparkle: a four-point star (plus a soft core) when this flower catches the sun.
      float star = exp(-abs(q.x) * 16.0) * exp(-abs(q.y) * 2.4) + exp(-abs(q.y) * 16.0) * exp(-abs(q.x) * 2.4) + exp(-dot(q, q) * 14.0);
      float g = vGlint * star;
      col += vec3(1.0, 0.98, 0.9) * g * 1.8;
      float fa = max(body, min(g, 1.0)) * vAlpha;
      if (vState > 3.5) {
        float ring = smoothstep(0.86, 0.92, r) * (1.0 - smoothstep(0.96, 1.0, r));
        col = mix(col, vColor * 0.6, ring);
        fa = max(fa, ring * 0.9);
      }
      if (fa < uAlphaCut) discard;
      gl_FragColor = vec4(col, fa);
      return;
    }
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
