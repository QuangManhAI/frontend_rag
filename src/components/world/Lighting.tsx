import { useTheme } from '../../theme/useTheme';
import { opaqueHex } from '../../theme/tokens';

export function Lighting() {
  const theme = useTheme();
  return (
    <>
      <ambientLight intensity={theme.ambient} />
      <hemisphereLight args={[opaqueHex(theme.bgHorizon), opaqueHex(theme.groundBase), theme.ambient * 1.4]} />
      <directionalLight position={[90, 170, 70]} intensity={theme.sun} />
      <directionalLight position={[-80, 60, -90]} intensity={theme.sun * 0.35} color={opaqueHex(theme.uiAccent)} />
      <pointLight position={[0, 90, 0]} intensity={theme.name === 'dark' ? 1800 : 400} distance={160} color={opaqueHex(theme.trunkVein)} />
    </>
  );
}
