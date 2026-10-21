import { AlertTriangle, Eye, EyeOff, Lock, Mail, SendHorizonal, User } from 'lucide-react';
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
      <div className="my-auto w-full px-1 py-4">
        {/* Vector Knowledge Tree emblem (synced with TopBar) & heading */}
        <div className="text-center mb-6">
          <div className="liquid-emblem" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden className="flex-none">
              <circle cx="12" cy="7" r="5" fill="var(--accent)" opacity="0.25" />
              <path d="M12 21V11M12 14l-4-4M12 12l4-4" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="8" cy="10" r="1.6" fill="var(--cat-1, var(--accent))" />
              <circle cx="16" cy="8" r="1.6" fill="var(--cat-2, var(--accent))" />
              <circle cx="12" cy="5" r="1.6" fill="var(--cat-0, var(--accent))" />
            </svg>
          </div>
          <h3 className="text-base font-semibold tracking-tight text-[var(--ink)]">
            {isLogin ? 'Đăng nhập' : 'Đăng ký tài khoản'}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--ink-muted)]">
            {isLogin
              ? 'Đăng nhập để hỏi đáp và đối chiếu trích dẫn khoa học.'
              : 'Tạo tài khoản mới để bắt đầu phiên hỏi đáp RAG.'}
          </p>
        </div>

        {/* Error banner synced with MessageBubble AlertTriangle */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 rounded-xl border border-[color-mix(in_srgb,var(--danger)_50%,transparent)] bg-transparent backdrop-blur-md px-3.5 py-2.5 text-xs text-[var(--danger)] fade-in"
          >
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span className="leading-snug">{error}</span>
          </div>
        )}

        {/* Transparent glass form inputs with clean inline icons */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
          {!isLogin && (
            <div className="flex flex-col gap-1.5 fade-in">
              <label htmlFor="auth-display-name" className="text-[11px] font-medium text-[var(--ink-muted)] px-1">
                Tên hiển thị
              </label>
              <div className="liquid-input-wrap">
                <User size={15} className="ml-3.5 shrink-0 text-[var(--accent)] opacity-85" aria-hidden="true" />
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
              <Mail size={15} className="ml-3.5 shrink-0 text-[var(--accent)] opacity-85" aria-hidden="true" />
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
              <Lock size={15} className="ml-3.5 shrink-0 text-[var(--accent)] opacity-85" aria-hidden="true" />
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
                className="mr-2.5 rounded-lg p-1 text-[var(--ink-muted)] transition hover:text-[var(--ink)] cursor-pointer"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading} className="liquid-cta-btn mt-2">
            <span>{loading ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}</span>
            {!loading && <SendHorizonal size={0} className="text-[var(--accent)]" />}
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
