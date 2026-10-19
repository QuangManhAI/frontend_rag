/** Canopy points: size attenuation with clamps, twinkle, state boosts, year cut-off. */
export const CANOPY_VERT = /* glsl */ `
  attribute vec3 color;
  attribute float size;
  attribute float phase;
  attribute float state;
  attribute float year;
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

  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    float s = size;
    float alpha = 0.9;
    float boost = 0.0;
    float maxPx = uMaxPx;
    if (state > 0.5 && state < 1.5) { alpha = 0.1; s *= 0.65; }
    else if (state > 1.5 && state < 2.5) { s *= 1.7; boost = 0.45; maxPx *= 1.6; }
    else if (state > 2.5 && state < 3.5) { s *= 2.4; boost = 0.7; maxPx *= 2.2; }
    else if (state > 3.5) { s *= 3.0 * (1.0 + 0.18 * sin(uTime * 4.5)); boost = 0.8; maxPx *= 2.8; }
    float tw = 1.0 + uTwinkle * 0.18 * sin(uTime * (1.2 + phase) + phase * 6.2831);
    float px = clamp(s * tw * uScale / -mv.z, uMinPx, maxPx) * uPixelRatio;
    if (year > uMaxYear) { px = 0.0; alpha = 0.0; }
    // Big sprites overlap and saturate when the camera is close: fade them a little.
    if (state < 1.5) alpha *= clamp(10.0 / max(px / uPixelRatio, 1.0), 0.4, 1.0);
    gl_PointSize = px;
    gl_Position = projectionMatrix * mv;
    vColor = mix(color, vec3(1.0), boost * 0.35) * (1.0 + boost);
    vAlpha = alpha;
    vState = state;
  }
`;

export const CANOPY_FRAG = /* glsl */ `
  uniform float uGlow;
  uniform vec3 uOutlineColor;
  uniform float uOutline;
  varying vec3 vColor;
  varying float vAlpha;
  varying float vState;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
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
    gl_FragColor = vec4(col, a);
  }
`;
