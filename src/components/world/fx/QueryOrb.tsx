import { Billboard, Trail } from '@react-three/drei';
import { forwardRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useTheme } from '../../../theme/useTheme';
import { opaqueHex } from '../../../theme/tokens';
import { glowBlending, toColor } from '../materials';

const HALO_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const HALO_FRAG = /* glsl */ `
  uniform vec3 uColor;
  uniform float uStrength;
  varying vec2 vUv;
  void main() {
    float d = length(vUv - 0.5) * 2.0;
    float a = exp(-d * d * 5.0) * uStrength * (1.0 - smoothstep(0.85, 1.0, d));
    gl_FragColor = vec4(uColor, a);
  }
`;

/** The glowing query vector: bright core, billboard halo, light trail. Positioned by QueryFlight. */
export const QueryOrb = forwardRef<THREE.Group, { size?: number }>(function QueryOrb({ size = 1 }, ref) {
  const theme = useTheme();
  const halo = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: HALO_VERT,
        fragmentShader: HALO_FRAG,
        transparent: true,
        depthWrite: false,
        uniforms: { uColor: { value: new THREE.Color() }, uStrength: { value: 1 } },
      }),
    [],
  );
  useEffect(() => {
    halo.uniforms.uColor.value.copy(toColor(theme.queryOrbHalo));
    halo.uniforms.uStrength.value = theme.additiveGlow ? 0.75 : 0.5;
    halo.blending = glowBlending(theme);
    halo.needsUpdate = true;
  }, [theme, halo]);
  useEffect(() => () => halo.dispose(), [halo]);

  const core = useMemo(() => toColor(theme.queryOrb).multiplyScalar(theme.additiveGlow ? 2 : 1), [theme]);

  return (
    <group ref={ref} visible={false}>
      <Trail width={2.4 * size} length={8} color={opaqueHex(theme.queryOrbHalo)} attenuation={(w) => w * w} decay={1}>
        <mesh>
          <sphereGeometry args={[1.05 * size, 14, 14]} />
          <meshBasicMaterial color={core} toneMapped={false} />
        </mesh>
      </Trail>
      <Billboard>
        <mesh material={halo} renderOrder={5}>
          <planeGeometry args={[5.5 * size, 5.5 * size]} />
        </mesh>
      </Billboard>
      {theme.additiveGlow && <pointLight intensity={260 * size} distance={28} color={opaqueHex(theme.queryOrbHalo)} />}
    </group>
  );
});
