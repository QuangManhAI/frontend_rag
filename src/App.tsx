import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useUi } from './store/uiStore';
import { useWorld } from './store/worldStore';
import { useThemeSync } from './theme/useTheme';

export default function App() {
  useThemeSync();
  const reduceMotion = useUi((s) => s.settings.reduceMotion);
  useEffect(() => {
    // Yield to next frame to allow the critical text shell (ChatPanel & TopBar)
    // to paint immediately, guaranteeing LCP < 2.5s before heavy 3D scene init.
    const id = requestAnimationFrame(() => {
      void useWorld.getState().load();
    });
    return () => cancelAnimationFrame(id);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);
  return <AppShell />;
}
