import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32 } from '../../../api/mock/rng';
import { useUi } from '../../../store/uiStore';
import { useTheme } from '../../../theme/useTheme';
import { glowBlending, pointScale, SOFT_POINT_FRAG, toColor } from '../materials';

const VERT = /* glsl */ `
  attribute float aPhase;
  attribute float aSpeed;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform vec3 uColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = uTime * aSpeed;
    float ph = aPhase * 6.2831;
    vec3 p = position + vec3(sin(t + ph) * 4.0, sin(t * 0.7 + ph * 2.0) * 2.5, cos(t * 0.9 + ph * 1.5) * 4.0);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float flicker = 0.55 + 0.45 * sin(uTime * 2.3 + ph * 3.0);
    gl_PointSize = clamp(0.55 * uScale / -mv.z, 1.5, 14.0) * uPixelRatio * (0.7 + 0.3 * flicker);
    gl_Position = projectionMatrix * mv;
    vColor = uColor;
    vAlpha = flicker;
  }
`;

/** A few hundred fireflies drifting around the canopy — one draw call, motion in the shader. */
export function Fireflies({ count = 320 }: { count?: number }) {
  const theme = useTheme();
  const reduce = useUi((s) => s.settings.reduceMotion);
  const { size, camera, gl } = useThree();
  const geometry = useMemo(() => {
    const rng = mulberry32(42);
    const pos = new Float32Array(count * 3);
    const phase = new Float32Array(count);
    const speed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2;
      const r = 12 + Math.sqrt(rng()) * 62;
      pos.set([Math.cos(a) * r, 40 + rng() * 80, Math.sin(a) * r], i * 3);
      phase[i] = rng();
      speed[i] = 0.25 + rng() * 0.5;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    g.setAttribute('aSpeed', new THREE.BufferAttribute(speed, 1));
    return g;
  }, [count]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: SOFT_POINT_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uTime: { value: 0 }, uScale: { value: 500 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color() } },
      }),
    [],
  );

  useEffect(() => {
    material.uniforms.uColor.value.copy(toColor(theme.firefly)).multiplyScalar(theme.additiveGlow ? 1.6 : 1);
    material.blending = glowBlending(theme);
    material.needsUpdate = true;
  }, [theme, material]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((_, dt) => {
    if (!reduce) material.uniforms.uTime.value += dt;
    material.uniforms.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
