import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-black flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-sm flex items-center justify-center">
            <span className="text-black font-black text-sm">C</span>
          </div>
          <span className="text-white font-semibold tracking-wide text-lg">CandSync</span>
        </div>
        <div>
          <p className="text-white/30 text-xs uppercase tracking-[0.2em] mb-4">Recruitment Management</p>
          <h2 className="text-white text-4xl font-light leading-snug">
            Manage candidates.<br />
            <span className="font-semibold">Faster.</span>
          </h2>
        </div>
        <p className="text-white/20 text-xs">© {new Date().getFullYear()} CandSync</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-10 lg:hidden">
            <div className="w-7 h-7 bg-black rounded-sm flex items-center justify-center">
              <span className="text-white font-black text-xs">C</span>
            </div>
            <span className="font-semibold text-black">CandSync</span>
          </div>

          <h1 className="text-2xl font-semibold text-black mb-1">Sign in</h1>
          <p className="text-slate-400 text-sm mb-8">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Email address</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={form.email}
                onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg bg-white text-black placeholder-slate-300 focus:outline-none focus:border-black transition-colors"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1.5">Password</label>
              <input
                type="password"
                required
                autoComplete="current-password"
                value={form.password}
                onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                className="w-full px-4 py-3 text-sm border border-slate-200 rounded-lg bg-white text-black placeholder-slate-300 focus:outline-none focus:border-black transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-3 rounded-lg text-sm font-medium hover:bg-slate-800 active:bg-slate-900 transition-colors disabled:opacity-40 mt-2"
            >
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
