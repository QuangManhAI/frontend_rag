import {
  ArrowRight,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Sparkles,
  User as UserIcon,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { useAuth } from '../../store/authStore';

export function AuthOverlay() {
  const login = useAuth((s) => s.login);
  const register = useAuth((s) => s.register);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const switchMode = (nextIsLogin: boolean) => {
    setIsLogin(nextIsLogin);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra, vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="liquid-auth-shell scroll-thin fade-in"
      onKeyDown={(e) => e.stopPropagation()}
      data-testid="chat-auth-panel"
    >
      {/* Ambient liquid caustic plasma orbs directly inside the chat panel */}
      <div className="liquid-caustic-orb orb-cyan" aria-hidden="true" />
      <div className="liquid-caustic-orb orb-violet" aria-hidden="true" />
      <div className="liquid-caustic-orb orb-mint" aria-hidden="true" />

      <div className="my-auto w-full px-1 py-4">
        {/* Refractive crystal emblem & heading */}
        <div className="text-center mb-6">
          <div className="liquid-emblem" aria-hidden="true">
            <Sparkles size={22} strokeWidth={1.9} />
          </div>
          <h3 className="text-lg font-semibold tracking-tight text-[var(--ink)]">
            {isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}
          </h3>
          <p className="mt-1.5 text-xs leading-relaxed text-[var(--ink-muted)]">
            {isLogin
              ? 'Đăng nhập để hỏi đáp và đối chiếu trích dẫn khoa học.'
              : 'Tạo tài khoản mới để bắt đầu phiên hỏi đáp RAG.'}
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_50%,transparent)] bg-[color-mix(in_srgb,var(--danger)_15%,transparent)] px-3.5 py-2.5 text-xs text-[var(--ink)] shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] fade-in"
          >
            <XCircle size={15} className="mt-0.5 shrink-0 text-[var(--danger)]" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Form inputs directly in the chat panel */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {!isLogin && (
            <div className="flex flex-col gap-1.5 fade-in">
              <label htmlFor="auth-display-name" className="text-[11px] font-medium text-[var(--ink-muted)] px-1">
                Tên hiển thị
              </label>
              <div className="liquid-input-wrap">
                <span className="liquid-input-icon" aria-hidden="true">
                  <UserIcon size={15} />
                </span>
                <input
                  id="auth-display-name"
                  type="text"
                  placeholder="VD: Minh Trần"
                  required
                  maxLength={60}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="liquid-input"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor="auth-email" className="text-[11px] font-medium text-[var(--ink-muted)] px-1">
              Địa chỉ Email
            </label>
            <div className="liquid-input-wrap">
              <span className="liquid-input-icon" aria-hidden="true">
                <Mail size={15} />
              </span>
              <input
                id="auth-email"
                type="email"
                placeholder="researcher@university.edu"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="liquid-input"
                autoComplete="email"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between px-1">
              <label htmlFor="auth-password" className="text-[11px] font-medium text-[var(--ink-muted)]">
                Mật khẩu
              </label>
              <span className="text-[10px] text-[var(--ink-muted)] opacity-75 mono">≥ 8 ký tự</span>
            </div>
            <div className="liquid-input-wrap">
              <span className="liquid-input-icon" aria-hidden="true">
                <Lock size={15} />
              </span>
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="liquid-input"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                className="mr-2 rounded-lg p-1.5 text-[var(--ink-muted)] transition hover:bg-white/10 hover:text-[var(--ink)]"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="liquid-cta-btn mt-2">
            <span>
              {loading
                ? 'Đang xử lý...'
                : isLogin
                  ? 'Đăng nhập'
                  : 'Đăng ký'}
            </span>
            {!loading && <ArrowRight size={16} strokeWidth={2.2} />}
          </button>
        </form>

        {/* Bottom switch link */}
        <p className="mt-5 text-center text-xs text-[var(--ink-muted)]">
          {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
          <button
            type="button"
            onClick={() => switchMode(!isLogin)}
            className="font-semibold text-[var(--accent)] hover:underline cursor-pointer"
          >
            {isLogin ? 'Đăng ký ngay' : 'Đăng nhập'}
          </button>
        </p>
      </div>
    </div>
  );
}
