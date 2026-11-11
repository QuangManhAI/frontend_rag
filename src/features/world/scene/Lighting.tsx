import { useTheme } from '../../../shared/theme/useTheme';
import { opaqueHex } from '../../../shared/theme/tokens';
import { DAY_FILL_LIGHT_POSITION, DAY_SUN_LIGHT_POSITION, NIGHT_MOON_LIGHT_POSITION } from '../lib/sun';

export function Lighting() {
  const theme = useTheme();
  const day = theme.daySky;
  return (
    <>
      <ambientLight intensity={theme.ambient} />
      <hemisphereLight args={[opaqueHex(theme.bgHorizon), opaqueHex(theme.groundBase), theme.ambient * 1.4]} />
      {/* Day: warm sun from upper side + soft fill. Night: moonlight from the visible moon's celestial position. */}
      <directionalLight position={[...(day ? DAY_SUN_LIGHT_POSITION : NIGHT_MOON_LIGHT_POSITION)]} intensity={theme.sun} color={opaqueHex(day ? theme.sunColor : theme.moonColor)} />
      {day && <directionalLight position={[...DAY_FILL_LIGHT_POSITION]} intensity={theme.sun * 0.45} />}
      <directionalLight position={[-80, 60, -90]} intensity={theme.sun * 0.35} color={opaqueHex(theme.uiAccent)} />
      <pointLight position={[0, 90, 0]} intensity={theme.name === 'dark' ? 1800 : 400} distance={160} color={opaqueHex(theme.trunkVein)} />
    </>
  );
}
