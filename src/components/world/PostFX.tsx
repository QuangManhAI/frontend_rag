import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useTheme } from '../../theme/useTheme';

export function PostFX() {
  const theme = useTheme();
  return (
    <EffectComposer multisampling={4}>
      <Bloom mipmapBlur intensity={theme.bloomIntensity} luminanceThreshold={theme.bloomThreshold} luminanceSmoothing={0.25} radius={0.72} />
      <Vignette eskil={false} offset={0.28} darkness={theme.name === 'dark' ? 0.62 : 0.22} />
    </EffectComposer>
  );
}
