import { useFrame } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import type * as THREE from 'three';
import { useUi } from '../../store/uiStore';

/**
 * Page-load intro: the whole world (tree, canopy, fireflies, ground, knowledge blocks) lights up
 * from dark. The sky is left out so the scene emerges against it.
 */
const DELAY = 0.2;
const DURATION = 3;
/** Diffuse floor for lit meshes, so the tree starts as a silhouette rather than a black hole. */
const FLOOR = 0.12;

/** Shared uniform, 0 → 1 over the intro: plug it into materials or read `.value` per frame. */
export const sceneIntro = { value: 0 };

/** Diffuse multiplier for lit (MeshStandard) meshes at intro progress `k`. */
export const introBrightness = (k: number) => FLOOR + (1 - FLOOR) * k;

/** Drives `sceneIntro`; mounted once in the canvas, so a remounted world replays the intro. */
export function SceneIntro() {
  const reduce = useUi((s) => s.settings.reduceMotion);
  const t = useRef(0);

  useEffect(() => {
    sceneIntro.value = 0;
  }, []);

  // Runs before every other useFrame so they all read this frame's value.
  useFrame((_, dt) => {
    if (sceneIntro.value >= 1) return;
    // Cap dt: the first frames stall on shader compiles and would eat the start of the fade.
    t.current += Math.min(dt, 0.1);
    const x = Math.min(1, Math.max(0, (t.current - DELAY) / DURATION));
    sceneIntro.value = reduce ? 1 : x * x * (3 - 2 * x);
  }, -1);

  return null;
}

/** Fades a ShaderMaterial with the intro: its final color *and* alpha scale by `sceneIntro`. */
export function withSceneIntro<T extends THREE.ShaderMaterial>(m: T): T {
  m.uniforms.uSceneIntro = sceneIntro;
  const end = m.fragmentShader.lastIndexOf('}');
  m.fragmentShader = `uniform float uSceneIntro;\n${m.fragmentShader.slice(0, end)}  gl_FragColor *= uSceneIntro;\n${m.fragmentShader.slice(end)}`;
  return m;
}
