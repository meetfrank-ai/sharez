import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api from '../utils/api';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords don\'t match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', { token, new_password: password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="text-center">
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Invalid reset link.</p>
          <Link to="/forgot-password" className="text-sm font-semibold no-underline" style={{ color: 'var(--accent)' }}>Request a new one</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-3"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>S</div>
          <h1 className="text-2xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>New password</h1>
        </div>

        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          {done ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✅</div>
              <h2 className="text-base font-semibold m-0 mb-2" style={{ color: 'var(--text-primary)' }}>Password reset!</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>You can now log in with your new password.</p>
              <Link to="/login"
                className="inline-block px-6 py-2.5 rounded-lg text-sm font-semibold no-underline"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                Go to login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>New password</label>
                <input type="password" placeholder="Min 6 characters" value={password}
                  onChange={(e) => setPassword(e.target.value)} required minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Confirm password</label>
                <input type="password" placeholder="Repeat password" value={confirm}
                  onChange={(e) => setConfirm(e.target.value)} required minLength={6}
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              </div>
              {error && (
                <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                  <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
                </div>
              )}
              <button type="submit" disabled={loading}
                className="w-full py-2.5 rounded-lg font-semibold text-sm border-none cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                {loading ? 'Resetting...' : 'Reset password'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
