import { Stars } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../theme/useTheme';
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
  varying vec3 vDir;
  void main() {
    float h = vDir.y;
    vec3 c = h > 0.0 ? mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.55)) : mix(uHorizon, uBottom, pow(clamp(-h, 0.0, 1.0), 0.4));
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
        uniforms: { uTop: { value: new THREE.Color() }, uHorizon: { value: new THREE.Color() }, uBottom: { value: new THREE.Color() } },
      }),
    [],
  );

  useEffect(() => {
    material.uniforms.uTop.value.copy(toColor(theme.bgTop));
    material.uniforms.uHorizon.value.copy(toColor(theme.bgHorizon));
    material.uniforms.uBottom.value.copy(toColor(theme.fog));
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
      {theme.name === 'dark' && <Stars radius={700} depth={300} count={2500} factor={9} saturation={0.6} fade speed={0.4} />}
    </>
  );
}
