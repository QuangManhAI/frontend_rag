import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { mulberry32, hashString } from '../../../api/mock/rng';
import { useTheme } from '../../../theme/useTheme';
import { animationConfig } from '../../../utils/animationConfig';
import { QUERY_ORIGIN } from '../../../utils/flight';
import { glowBlending, pointScale, SOFT_POINT_FRAG, toColor } from '../materials';
import { Anchor } from '../overlay/anchors';

const VERT = /* glsl */ `
  attribute vec3 aStart;
  attribute float aDelay;
  uniform float uProgress;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform vec3 uColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float p = clamp((uProgress - aDelay) / 0.55, 0.0, 1.0);
    float e = p * p * (3.0 - 2.0 * p);
    vec3 swirl = vec3(sin(e * 9.0 + aDelay * 30.0), cos(e * 7.0 + aDelay * 20.0), sin(e * 8.0)) * (1.0 - e) * 1.2;
    vec3 pos = mix(position + aStart, position, e) + swirl;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = clamp(0.5 * uScale / -mv.z, 1.5, 7.0) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
    vColor = uColor;
    vAlpha = smoothstep(0.0, 0.15, uProgress) * (1.0 - smoothstep(0.92, 1.0, p));
  }
`;

/** Particles of the question's letters collapsing into the orb (the text itself is QueryTextLabel). */
export function QueryText({ text }: { text: string }) {
  const theme = useTheme();
  const { size, camera, gl } = useThree();
  const count = Math.min(420, 60 + text.length * 8);
  const geometry = useMemo(() => {
    const rng = mulberry32(hashString(text));
    const width = Math.min(60, 4 + text.length * 0.55);
    const start = new Float32Array(count * 3);
    const delay = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      start.set([(rng() - 0.5) * width, (rng() - 0.5) * 2.2, (rng() - 0.5) * 1.5], i * 3);
      delay[i] = 0.25 + rng() * 0.25;
    }
    const g = new THREE.BufferGeometry();
    const base = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) base.set(QUERY_ORIGIN, i * 3);
    g.setAttribute('position', new THREE.BufferAttribute(base, 3));
    g.setAttribute('aStart', new THREE.BufferAttribute(start, 3));
    g.setAttribute('aDelay', new THREE.BufferAttribute(delay, 1));
    g.computeBoundingSphere();
    if (g.boundingSphere) g.boundingSphere.radius += 35;
    return g;
  }, [text, count]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: SOFT_POINT_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uProgress: { value: 0 }, uScale: { value: 500 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color() } },
      }),
    [],
  );
  useEffect(() => {
    material.uniforms.uColor.value.copy(toColor(theme.queryOrbHalo)).multiplyScalar(theme.additiveGlow ? 1.6 : 1);
    material.blending = glowBlending(theme);
    material.needsUpdate = true;
  }, [theme, material]);
  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((_, dt) => {
    material.uniforms.uProgress.value = Math.min(1, material.uniforms.uProgress.value + dt / animationConfig.embedding);
    material.uniforms.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  return <points geometry={geometry} material={material} raycast={() => null} />;
}

/** The question text itself (DOM overlay); CSS dissolves it while the particles converge. */
export function QueryTextLabel({ text }: { text: string }) {
  return (
    <Anchor position={[QUERY_ORIGIN[0], QUERY_ORIGIN[1] + 1, QUERY_ORIGIN[2]]}>
      <div className="query-text dissolve" data-testid="query-text">
        {text}
      </div>
    </Anchor>
  );
}
