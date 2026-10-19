import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { useUi } from './store/uiStore';
import { useWorld } from './store/worldStore';
import { useThemeSync } from './theme/useTheme';

export default function App() {
  useThemeSync();
  const reduceMotion = useUi((s) => s.settings.reduceMotion);
  useEffect(() => {
    void useWorld.getState().load();
  }, []);
  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);
  return <AppShell />;
}
