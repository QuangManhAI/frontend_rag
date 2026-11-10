import { useTheme } from '../../../shared/theme/useTheme';
import { opaqueHex } from '../../../shared/theme/tokens';
import { DAY_FILL_LIGHT_POSITION, DAY_SUN_LIGHT_POSITION } from '../lib/sun';

/** Night key light (moonlight from the front right). */
const NIGHT_KEY_POSITION: readonly [number, number, number] = [90, 170, 70];

export function Lighting() {
  const theme = useTheme();
  const day = theme.daySky;
  return (
    <>
      <ambientLight intensity={theme.ambient} />
      <hemisphereLight args={[opaqueHex(theme.bgHorizon), opaqueHex(theme.groundBase), theme.ambient * 1.4]} />
      {/* Day: warm sun from the visible sun's side + a soft front fill. Night: the original key light. */}
      <directionalLight position={[...(day ? DAY_SUN_LIGHT_POSITION : NIGHT_KEY_POSITION)]} intensity={theme.sun} color={day ? opaqueHex(theme.sunColor) : undefined} />
      {day && <directionalLight position={[...DAY_FILL_LIGHT_POSITION]} intensity={theme.sun * 0.45} />}
      <directionalLight position={[-80, 60, -90]} intensity={theme.sun * 0.35} color={opaqueHex(theme.uiAccent)} />
      <pointLight position={[0, 90, 0]} intensity={theme.name === 'dark' ? 1800 : 400} distance={160} color={opaqueHex(theme.trunkVein)} />
    </>
  );
}
