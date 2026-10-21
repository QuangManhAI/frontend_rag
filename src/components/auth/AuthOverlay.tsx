import { useState } from 'react';
import { useAuth } from '../../store/authStore';
import { Mail, Lock, User as UserIcon, XCircle } from 'lucide-react';

export function AuthOverlay() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-md transition-all"
        onKeyDown={(e) => e.stopPropagation()} // Thêm dòng này để chặn rò rỉ sự kiện phím
      >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-md">
        
        {/* Glow effect phía sau form */}
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-blue-500/30 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 h-48 w-48 rounded-full bg-purple-500/30 blur-3xl" />

        <div className="relative z-10">
          <h2 className="mb-6 text-center text-3xl font-light tracking-wide text-white">
            {isLogin ? 'Welcome Back' : 'Join the Nexus'}
          </h2>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-red-500/20 p-3 text-sm text-red-200 border border-red-500/30">
              <XCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {!isLogin && (
              <div className="relative">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
                <input
                  type="text"
                  placeholder="Display Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-white/10"
                />
              </div>
            )}
            
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-white/10"
              />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" size={18} />
              <input
                type="password"
                placeholder="Password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/40 outline-none transition focus:border-white/40 focus:bg-white/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-white/20 py-3 font-medium text-white transition hover:bg-white/30 disabled:opacity-50"
            >
              {loading ? 'Processing...' : isLogin ? 'Access System' : 'Initialize Account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-white/60">
            {isLogin ? "Don't have an account?" : "Already registered?"}{' '}
            <button
              onClick={() => { setIsLogin(!isLogin); setError(''); }}
              className="font-medium text-white hover:underline focus:outline-none"
            >
              {isLogin ? 'Create one' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}