import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFx } from '../../../store/fxStore';
import { useUi } from '../../../store/uiStore';
import { useWorld } from '../../../store/worldStore';
import { useTheme } from '../../../theme/useTheme';
import { hash01 } from '../../../utils/canopy';
import { glowBlending, pointScale, SOFT_POINT_FRAG, toColor } from '../materials';

const PER_VECTOR = 36;

const VERT = /* glsl */ `
  attribute float aPhase;
  uniform vec3 uEnd;
  uniform float uTime;
  uniform float uScale;
  uniform float uPixelRatio;
  uniform vec3 uColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float t = fract(uTime * 0.55 + aPhase);
    float e = t * t;
    vec3 mid = mix(position, uEnd, 0.5) + vec3(0.0, 3.0, 0.0);
    vec3 p = mix(mix(position, mid, e), mix(mid, uEnd, e), e);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_PointSize = clamp(0.6 * uScale / -mv.z, 1.5, 10.0) * uPixelRatio;
    gl_Position = projectionMatrix * mv;
    vColor = uColor;
    vAlpha = smoothstep(0.0, 0.1, t) * (1.0 - smoothstep(0.85, 1.0, t));
  }
`;

/** Essence particles flowing from the top-k vectors into the orb while the LLM writes. */
export function EssenceFlow() {
  const topK = useFx((s) => s.topK);
  const anchor = useFx((s) => s.anchor);
  const vectors = useWorld((s) => s.vectors);
  const reduce = useUi((s) => s.settings.reduceMotion);
  const theme = useTheme();
  const { size, camera, gl } = useThree();

  const geometry = useMemo(() => {
    if (!vectors || topK.length === 0) return null;
    const n = topK.length * PER_VECTOR;
    const pos = new Float32Array(n * 3);
    const phase = new Float32Array(n);
    topK.forEach((t, k) => {
      for (let j = 0; j < PER_VECTOR; j++) {
        const i = k * PER_VECTOR + j;
        pos.set([vectors.positions[t.index * 3], vectors.positions[t.index * 3 + 1], vectors.positions[t.index * 3 + 2]], i * 3);
        phase[i] = hash01(i * 7 + k);
      }
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aPhase', new THREE.BufferAttribute(phase, 1));
    return g;
  }, [topK, vectors]);
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: SOFT_POINT_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uEnd: { value: new THREE.Vector3() }, uTime: { value: 0 }, uScale: { value: 500 }, uPixelRatio: { value: 1 }, uColor: { value: new THREE.Color() } },
      }),
    [],
  );
  useEffect(() => {
    material.uniforms.uColor.value.copy(toColor(theme.queryOrbHalo)).multiplyScalar(theme.additiveGlow ? 1.8 : 1);
    material.blending = glowBlending(theme);
    material.needsUpdate = true;
  }, [theme, material]);
  useEffect(() => {
    if (anchor) material.uniforms.uEnd.value.set(...anchor);
  }, [anchor, material]);
  useEffect(() => () => geometry?.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, dt) => {
    if (!reduce) material.uniforms.uTime.value += dt;
    material.uniforms.uScale.value = pointScale(size.height, (camera as THREE.PerspectiveCamera).fov);
    material.uniforms.uPixelRatio.value = gl.getPixelRatio();
  });

  if (!geometry || !anchor) return null;
  return <points geometry={geometry} material={material} frustumCulled={false} raycast={() => null} />;
}
