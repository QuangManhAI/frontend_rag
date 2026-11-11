import { Stars } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../../shared/theme/useTheme';
import { useUi } from '../../../shared/store/uiStore';
import { MOON_DIR, SUN_DIR } from '../lib/sun';
import { toColor } from './materials';

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  varying vec3 vView;
  void main() {
    vDir = normalize(position);
    // Day sky is seen from the eye: horizon at eye level and the sun exactly where the light comes from.
    vView = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const SKY_FRAG = /* glsl */ `
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uBottom;
  uniform float uDay;
  uniform vec3 uHaze;
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform vec3 uMoonDir;
  uniform vec3 uMoonColor;
  uniform float uTime;
  varying vec3 vDir;
  varying vec3 vView;

  // Fast branchless 2D value noise (ALU only, 0 VRAM bandwidth)
  float hash21(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash21(i + vec2(0.0, 0.0)), hash21(i + vec2(1.0, 0.0)), u.x),
      mix(hash21(i + vec2(0.0, 1.0)), hash21(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  const mat2 ROT = mat2(0.80, 0.60, -0.60, 0.80);

  float fbm(vec2 p) {
    float v = 0.0;
    v += 0.5000 * vnoise(p); p = ROT * p * 2.02;
    v += 0.2500 * vnoise(p); p = ROT * p * 2.03;
    v += 0.1250 * vnoise(p);
    return v;
  }

  void main() {
    vec3 d = normalize(vView);
    float h = d.y;
    if (uDay < 0.5) {
      vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, pow(clamp(-h, 0.0, 1.0), 0.4));

      // --- NIGHT SKY: ELEGANT MOON & LUMINOUS HALO ---
      float moonDot = max(dot(d, uMoonDir), 0.0);

      // Atmospheric lunar corona & soft aura
      c += vec3(0.06, 0.10, 0.22) * pow(moonDot, 8.0) * 0.35;
      c += vec3(0.25, 0.45, 0.75) * pow(moonDot, 45.0) * 0.5;
      c += vec3(0.65, 0.82, 1.00) * pow(moonDot, 220.0) * 0.85;

      // Refined Moon Disc: ~2.1° crisp celestial scale
      float moonRad = 0.99935;
      if (moonDot > moonRad - 0.0015) {
        vec3 mUp = abs(uMoonDir.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(0.0, 0.0, 1.0);
        vec3 mRight = normalize(cross(mUp, uMoonDir));
        vec3 mTrueUp = cross(uMoonDir, mRight);
        vec2 mUV = vec2(dot(d, mRight), dot(d, mTrueUp)) / sqrt(2.0 * (1.0 - moonRad));
        float dMoon = length(mUV);
        if (dMoon <= 1.0) {
          float mask = smoothstep(1.0, 0.94, dMoon);
          float z = sqrt(max(0.0, 1.0 - dMoon * dMoon));

          // Soft organic lunar maria (subtle contrast, elegant texture)
          float maria = fbm(mUV * 2.6 + vec2(1.8, 3.4));
          vec3 mBase = uMoonColor;
          vec3 mMaria = mix(uMoonColor * 0.75, vec3(0.62, 0.70, 0.82), 0.45);
          vec3 mSurface = mix(mMaria, mBase, smoothstep(0.35, 0.65, maria));

          // 3D spherical limb & gentle phase lighting
          float limb = pow(z, 0.30);
          float phase = clamp(mUV.x * 0.25 + z * 0.92, 0.25, 1.15);
          vec3 moonColor = mSurface * limb * phase * 2.1; // Gentle HDR bloom

          c = mix(c, moonColor, mask);
        }
      }

      // Dither away 8-bit banding in the smooth gradient.
      c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
      gl_FragColor = vec4(c, 1.0);
      return;
    }

    // --- DAYTIME SKY ---
    // Rayleigh scattering: blue deepens toward the zenith.
    float up = max(h, 0.0);
    vec3 c = mix(uHorizon, uTop, 1.0 - exp(-up * 5.0));

    // Below the horizon: soft blue-haze gradient.
    float down = max(-h, 0.0);
    c = h < 0.0 ? mix(uHorizon, mix(uTop, uHorizon, 0.35), 1.0 - exp(-down * 3.8)) : c;

    // Aerial perspective: warm, golden-white haze line along the horizon.
    c = mix(c, uHaze, exp(-abs(h) * 24.0) * 0.75);

    // Sun forward scattering (Mie aureole & corona) + warm golden horizon bloom
    float mu = max(dot(d, uSunDir), 0.0);
    vec3 warmSunGlow = mix(uHorizon, vec3(1.0, 0.92, 0.78), 0.6);
    c = mix(c, warmSunGlow, pow(mu, 3.2) * 0.65);
    c += uSunColor * (pow(mu, 20.0) * 0.4 + pow(mu, 240.0) * 1.1);

    // Sun disc glare for bloom pass
    float disc = smoothstep(0.99955, 0.99975, mu);
    c = mix(c, uSunColor * 4.5, disc);

    // --- PROCEDURAL CLOUD LAYER (Analytical Planar Projection) ---
    float denom = max(abs(h), 0.04);
    vec2 wind = vec2(uTime * 0.012, uTime * 0.006);
    vec2 skyUV = (d.xz / denom) * 0.28 + wind;

    float n = fbm(skyUV);
    // Billowy cumulus cloud density
    float density = smoothstep(0.42, 0.80, n);

    if (density > 0.001) {
      // Pseudo-3D sunlight scattering & self-shadowing
      vec2 sunOffset = normalize(uSunDir.xz + vec2(0.0001)) * 0.09;
      float nSun = fbm(skyUV + sunOffset);
      float selfShadow = clamp((n - nSun) * 2.4, -0.25, 0.75);

      // Silver lining facing the sun
      float silverLining = pow(mu, 3.5) * 1.35;

      vec3 cloudSun = mix(vec3(1.0, 0.99, 0.97), uSunColor, 0.5) * (1.0 + silverLining);
      vec3 cloudShade = mix(uHorizon * 0.7, vec3(0.60, 0.70, 0.85), 0.55);
      vec3 cloudColor = mix(cloudShade, cloudSun, clamp(0.52 + selfShadow + silverLining * 0.45, 0.0, 1.0));

      if (h > 0.0) {
        // Upper hemisphere clouds: smooth horizon fade & distance fade
        float cloudFade = smoothstep(0.015, 0.22, h);
        float distFade = exp(-length(d.xz / denom) * 0.07);
        float cloudAlpha = density * cloudFade * distFade * 0.88;
        c = mix(c, cloudColor, cloudAlpha);
      } else {
        // Lower hemisphere soft misty water/ground reflection
        float refFade = smoothstep(0.02, 0.25, down);
        float distFade = exp(-length(d.xz / denom) * 0.10);
        float refAlpha = density * refFade * distFade * 0.22;
        c = mix(c, cloudColor * 0.75, refAlpha);
      }
    }

    // Dither away 8-bit banding in the smooth gradient.
    c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** Gradient sky dome + scene fog + procedural clouds + moon, both updated in place when the theme changes. */
export function SkyBackground() {
  const theme = useTheme();
  const scene = useThree((s) => s.scene);
  const reduceMotion = useUi((s) => s.settings.reduceMotion);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: SKY_VERT,
        fragmentShader: SKY_FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTop: { value: new THREE.Color() },
          uHorizon: { value: new THREE.Color() },
          uBottom: { value: new THREE.Color() },
          uDay: { value: 0 },
          uHaze: { value: new THREE.Color() },
          uSunDir: { value: new THREE.Vector3(...SUN_DIR).normalize() },
          uSunColor: { value: new THREE.Color() },
          uMoonDir: { value: new THREE.Vector3(...MOON_DIR).normalize() },
          uMoonColor: { value: new THREE.Color() },
          uTime: { value: 0 },
        },
      }),
    [],
  );

  useFrame((_, dt) => {
    if (!reduceMotion && theme.daySky) {
      material.uniforms.uTime.value += dt;
    }
  });

  useEffect(() => {
    material.uniforms.uTop.value.copy(toColor(theme.bgTop));
    material.uniforms.uHorizon.value.copy(toColor(theme.bgHorizon));
    material.uniforms.uBottom.value.copy(toColor(theme.fog));
    material.uniforms.uDay.value = theme.daySky ? 1 : 0;
    material.uniforms.uHaze.value.copy(toColor(theme.skyHaze));
    material.uniforms.uSunColor.value.copy(toColor(theme.sunColor));
    material.uniforms.uSunDir.value.copy(new THREE.Vector3(...SUN_DIR).normalize());
    material.uniforms.uMoonDir.value.copy(new THREE.Vector3(...MOON_DIR).normalize());
    material.uniforms.uMoonColor.value.copy(toColor(theme.moonColor));
    if (scene.fog instanceof THREE.Fog) {
      scene.fog.color.copy(toColor(theme.fog));
      scene.fog.near = theme.fogNear;
      scene.fog.far = theme.fogFar;
    } else {
      scene.fog = new THREE.Fog(toColor(theme.fog), theme.fogNear, theme.fogFar);
    }
    scene.background = toColor(theme.bg);
  }, [theme, material, scene]);

  useEffect(() => () => material.dispose(), [material]);

  return (
    <>
      <mesh material={material} renderOrder={-10} frustumCulled={false}>
        <sphereGeometry args={[1400, 32, 16]} />
      </mesh>
      {theme.stars && <Stars radius={700} depth={300} count={2500} factor={9} saturation={0.6} fade speed={0.4} />}
    </>
  );
}
