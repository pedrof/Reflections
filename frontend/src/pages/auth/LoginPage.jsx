import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/auth.store.js';
import { reflectionsSayings } from '../../constants/sayings.js';
import api from '../../services/api.js';
import Spinner from '../../components/ui/Spinner.jsx';

export default function LoginPage() {
  const [mode, setMode] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const saying = reflectionsSayings[Math.floor(Math.random() * reflectionsSayings.length)];

  useEffect(() => {
    if (isAuthenticated) { navigate(from, { replace: true }); return; }
    api.get('/auth/config').then(({ data }) => setMode(data.mode)).catch(() => setMode('local'));
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleOidc = () => {
    window.location.href = `${import.meta.env.VITE_API_BASE_URL || '/api'}/auth/oidc/login`;
  };

  if (!mode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-900">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-900 flex">
      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-surface-800 to-surface-900 border-r border-white/[0.06]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-indigo flex items-center justify-center text-white font-bold shadow-glow-indigo">
            R
          </div>
          <span className="text-lg font-semibold text-white">Reflections</span>
        </div>

        <div>
          <blockquote className="text-white/60 text-lg leading-relaxed italic mb-6">
            "{saying}"
          </blockquote>
          <div className="space-y-3">
            {[
              ['✦', 'Log accomplishments as they happen'],
              ['⊞', 'AI-powered STAR format rewriting'],
              ['📋', 'Generate Weekly Activity Reports'],
            ].map(([icon, text]) => (
              <div key={text} className="flex items-center gap-3 text-white/50 text-sm">
                <span className="text-indigo-400">{icon}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-white/20 text-xs">Government Performance Management System</p>
      </div>

      {/* Right — form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="mb-8">
            <div className="lg:hidden flex items-center gap-2 mb-6">
              <div className="w-8 h-8 rounded-lg bg-gradient-indigo flex items-center justify-center text-white font-bold text-sm shadow-glow-sm">R</div>
              <span className="font-semibold text-white">Reflections</span>
            </div>
            <h1 className="text-2xl font-semibold text-white mb-1">Welcome back</h1>
            <p className="text-sm text-white/50">Sign in to your account</p>
          </div>

          {mode === 'local' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="input-field"
                  placeholder="you@example.gov"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="input-field"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <div className="text-rose-400 text-sm bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
              <button type="submit" className="btn-primary w-full py-2.5" disabled={loading}>
                {loading ? <Spinner size="sm" /> : 'Sign in'}
              </button>
            </form>
          ) : (
            <button onClick={handleOidc} className="btn-primary w-full py-2.5">
              Sign in with SSO
            </button>
          )}

          <p className="mt-6 text-center text-xs text-white/25">
            Contact your administrator to reset your password
          </p>
        </div>
      </div>
    </div>
  );
}
