import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing';
import { useUi } from '../../store/uiStore';
import { useTheme } from '../../theme/useTheme';
import { LEGACY_FX } from '../../utils/perfProbe';

/**
 * No MSAA in the composer (it multiplied the cost of every blended sprite). No FXAA either: merged
 * into this EffectPass it masked the bloom and left a hard-edged ghost of the canopy on the sky
 * (seen in Safari/WebKit and Chromium); on dpr ≥ 1.5 screens aliasing is negligible anyway.
 * Bloom runs at half resolution with a mipmap blur and a threshold that keeps it on the truly
 * bright parts (point cores, the orb, sap veins). Tier 2 halves it again; tier 3 renders without it.
 */
export function PostFX() {
  const theme = useTheme();
  const tier = useUi((s) => s.qualityTier);
  if (tier >= 3) return null;
  const cheap = tier >= 2;
  if (LEGACY_FX) {
    const old = theme.name === 'dark' ? { intensity: 1.35, threshold: 0.18 } : { intensity: 0.35, threshold: 0.75 };
    return (
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur intensity={old.intensity} luminanceThreshold={old.threshold} luminanceSmoothing={0.25} radius={0.72} />
        <Vignette eskil={false} offset={0.28} darkness={theme.name === 'dark' ? 0.62 : 0.22} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom
        mipmapBlur
        resolutionScale={cheap ? 0.25 : 0.5}
        levels={cheap ? 5 : 7}
        intensity={theme.bloomIntensity}
        luminanceThreshold={theme.bloomThreshold}
        luminanceSmoothing={0.2}
        radius={0.72}
      />
      <Vignette eskil={false} offset={0.28} darkness={theme.name === 'dark' ? 0.62 : 0.22} />
    </EffectComposer>
  );
}
