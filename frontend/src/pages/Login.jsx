import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isRegister) {
        await register(email, password, displayName, handle);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm">
        {/* Brand */}
        <div className="text-center mb-8">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-3"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
          >
            S
          </div>
          <h1 className="text-2xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            Sharez
          </h1>
          <p className="text-sm mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
            See what your friends are investing in
          </p>
        </div>

        {/* Form */}
        <div
          className="rounded-xl p-6"
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <h2 className="text-base font-semibold text-center mb-5 m-0" style={{ color: 'var(--text-primary)' }}>
            {isRegister ? 'Create your account' : 'Welcome back'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isRegister && (
              <>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Full name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Thabo Mokoena"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: 'var(--text-muted)' }}>@</span>
                    <input
                      type="text"
                      placeholder="yourhandle"
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase())}
                      required
                      minLength={3}
                      maxLength={20}
                      className="w-full pl-7 pr-3 py-2.5 rounded-lg text-sm outline-none"
                      style={inputStyle}
                    />
                  </div>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
              <input
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Password</label>
              <input
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                style={inputStyle}
              />
            </div>

            {!isRegister && (
              <div className="text-right">
                <Link to="/forgot-password" className="text-xs no-underline" style={{ color: 'var(--accent)' }}>
                  Forgot password?
                </Link>
              </div>
            )}

            {error && (
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                <p className="text-xs text-center m-0" style={{ color: 'var(--danger)' }}>{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            >
              {loading ? 'Please wait...' : isRegister ? 'Create Account' : 'Sign In'}
            </button>
          </form>
        </div>

        <p className="text-sm text-center mt-5" style={{ color: 'var(--text-secondary)' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            onClick={() => { setIsRegister(!isRegister); setError(''); }}
            className="bg-transparent border-none cursor-pointer font-semibold text-sm"
            style={{ color: 'var(--accent)' }}
          >
            {isRegister ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}
