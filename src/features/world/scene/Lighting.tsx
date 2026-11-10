import { useTheme } from '../../../shared/theme/useTheme';
import { opaqueHex } from '../../../shared/theme/tokens';

/** Key light position; the day sky draws its sun glow in this direction. */
export const SUN_POSITION: readonly [number, number, number] = [90, 170, 70];

export function Lighting() {
  const theme = useTheme();
  return (
    <>
      <ambientLight intensity={theme.ambient} />
      <hemisphereLight args={[opaqueHex(theme.bgHorizon), opaqueHex(theme.groundBase), theme.ambient * 1.4]} />
      <directionalLight position={[...SUN_POSITION]} intensity={theme.sun} />
      <directionalLight position={[-80, 60, -90]} intensity={theme.sun * 0.35} color={opaqueHex(theme.uiAccent)} />
      <pointLight position={[0, 90, 0]} intensity={theme.name === 'dark' ? 1800 : 400} distance={160} color={opaqueHex(theme.trunkVein)} />
    </>
  );
}
