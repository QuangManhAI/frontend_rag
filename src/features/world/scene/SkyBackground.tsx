import { Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../../shared/theme/useTheme';
import { SUN_POSITION } from './Lighting';
import { toColor } from './materials';

const SKY_VERT = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = normalize(position);
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
  varying vec3 vDir;
  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;
    if (uDay < 0.5) {
      vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, pow(clamp(-h, 0.0, 1.0), 0.4));
      gl_FragColor = vec4(c, 1.0);
      return;
    }
    // Clear daytime sky. Rayleigh scattering: the air path shrinks fast above the horizon, so the blue
    // deepens within a few degrees and saturates toward the zenith.
    float up = max(h, 0.0);
    vec3 c = mix(uHorizon, uTop, 1.0 - exp(-up * 5.5));
    // The world floats in the sky: below the horizon the same clear blue returns, a little lighter.
    float down = max(-h, 0.0);
    c = h < 0.0 ? mix(uHorizon, mix(uTop, uHorizon, 0.35), 1.0 - exp(-down * 4.0)) : c;
    // Aerial perspective: a thin, almost white haze line right at the horizon.
    c = mix(c, uHaze, exp(-abs(h) * 28.0) * 0.7);
    // Mie forward scattering: broad warm brightening toward the sun plus a tighter aureole.
    float mu = max(dot(d, uSunDir), 0.0);
    c += vec3(1.0, 0.96, 0.88) * (pow(mu, 6.0) * 0.1 + pow(mu, 48.0) * 0.2);
    // The side away from the sun is a touch deeper (less in-scattered light).
    c *= 0.93 + 0.07 * (0.5 + 0.5 * dot(d, uSunDir));
    // Dither away 8-bit banding in the smooth gradient.
    c += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(c, 1.0);
  }
`;

/** Gradient sky dome + scene fog, both updated in place when the theme changes. */
export function SkyBackground() {
  const theme = useTheme();
  const scene = useThree((s) => s.scene);
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
          uSunDir: { value: new THREE.Vector3(...SUN_POSITION).normalize() },
        },
      }),
    [],
  );

  useEffect(() => {
    material.uniforms.uTop.value.copy(toColor(theme.bgTop));
    material.uniforms.uHorizon.value.copy(toColor(theme.bgHorizon));
    material.uniforms.uBottom.value.copy(toColor(theme.fog));
    material.uniforms.uDay.value = theme.daySky ? 1 : 0;
    material.uniforms.uHaze.value.copy(toColor(theme.skyHaze));
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
