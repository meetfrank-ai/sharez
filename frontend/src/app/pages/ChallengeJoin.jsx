import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import api from '../utils/api';

/**
 * Invite-code redemption page. Pre-fills from ?code=… so a shared invite
 * URL works one-click for the recipient.
 */
export default function ChallengeJoin() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const c = params.get('code');
    if (c) setCode(c);
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api.post(`/challenges/${slug}/join`, { invite_code: code.trim() });
      navigate(`/challenges/${slug}/picks`, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid invite code');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-10">
      <div className="text-center mb-6">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
          <Trophy size={28} />
        </div>
        <h1 className="text-xl font-semibold m-0 mb-2">Join the Crystal Ball</h1>
        <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>
          Enter the invite code you were sent.
        </p>
      </div>

      <form onSubmit={submit} className="rounded-xl p-5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Invite code</label>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="e.g. xK3p9-aB"
          className="w-full px-3 py-2.5 rounded-lg text-sm outline-none mb-3"
          style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'monospace' }}
        />
        {error && (
          <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: '#FEF2F2' }}>
            <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
          </div>
        )}
        <button type="submit" disabled={busy || !code.trim()}
          className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50 border-none cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
          {busy ? 'Checking…' : 'Redeem'}
        </button>
      </form>
    </div>
  );
}
