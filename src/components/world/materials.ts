import * as THREE from 'three';
import { opaqueHex, type ThemeTokens } from '../../theme/tokens';

export function toColor(hex: string): THREE.Color {
  return new THREE.Color(opaqueHex(hex));
}

/** Additive glow on dark skies, normal alpha blending on light ones. */
export function glowBlending(theme: ThemeTokens): THREE.Blending {
  return theme.additiveGlow ? THREE.AdditiveBlending : THREE.NormalBlending;
}

/** Pixels per world unit at distance 1 for the current viewport (for point sprites). */
export function pointScale(heightPx: number, fovDeg: number): number {
  return heightPx / (2 * Math.tan((fovDeg * Math.PI) / 360));
}

/** Makes a standard material also *emit* its vertex/instance color (neon look). */
export function addVertexColorGlow(material: THREE.MeshStandardMaterial, strength: { value: number }, cacheKey: string): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uSelfGlow = strength;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSelfGlow;')
      .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n#if defined( USE_COLOR ) || defined( USE_INSTANCING_COLOR )\ntotalEmissiveRadiance += vColor.rgb * diffuseColor.rgb * uSelfGlow;\n#endif');
  };
  material.customProgramCacheKey = () => cacheKey;
}

/** Soft round sprite with a bright core, shared by fireflies, sap and essence particles. */
export const SOFT_POINT_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c) * 2.0;
    if (d > 1.0) discard;
    float core = smoothstep(0.5, 0.0, d);
    float halo = exp(-d * d * 3.5) * 0.6;
    gl_FragColor = vec4(vColor * (core * 1.3 + halo), (core + halo) * vAlpha);
  }
`;
