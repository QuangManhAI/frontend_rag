import { useEffect } from 'react';
import { AppShell } from './components/layout/AppShell';
import { AuthOverlay } from './components/auth/AuthOverlay';
import { useUi } from './store/uiStore';
import { useWorld } from './store/worldStore';
import { useAuth } from './store/authStore';
import { useThemeSync } from './theme/useTheme';

export default function App() {
  useThemeSync();
  const reduceMotion = useUi((s) => s.settings.reduceMotion);
  const isAuthenticated = useAuth((s) => s.isAuthenticated);

  useEffect(() => {
    void useWorld.getState().load();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  return (
    <>
      {/* Nếu chưa đăng nhập thì render đè Auth Overlay lên */}
      {!isAuthenticated && <AuthOverlay />}
      
      {/* AppShell chứa Canvas 3D và Chat box. 
          Vẫn luôn được render để 3D model load ngầm phía dưới lớp kính mờ */}
      <AppShell />
    </>
  );
}
