import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.detail || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold mx-auto mb-3"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>S</div>
          <h1 className="text-2xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Reset password</h1>
        </div>

        <div className="rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          {sent ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-3">✉️</div>
              <h2 className="text-base font-semibold m-0 mb-2" style={{ color: 'var(--text-primary)' }}>Check your email</h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                If {email} is registered, we've sent a reset link. Check your inbox (and spam folder).
              </p>
              <Link to="/login" className="text-sm font-semibold no-underline mt-4 inline-block" style={{ color: 'var(--accent)' }}>
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Enter your email and we'll send you a link to reset your password.
              </p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email" placeholder="Your email" value={email}
                  onChange={(e) => setEmail(e.target.value)} required
                  className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                {error && (
                  <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                    <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
                  </div>
                )}
                <button type="submit" disabled={loading}
                  className="w-full py-2.5 rounded-lg font-semibold text-sm border-none cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                  {loading ? 'Sending...' : 'Send reset link'}
                </button>
              </form>
              <p className="text-center text-sm mt-4" style={{ color: 'var(--text-muted)' }}>
                <Link to="/login" className="no-underline" style={{ color: 'var(--accent)' }}>Back to login</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
