import { useState } from 'react';
import { Check } from 'lucide-react';
import api from '../utils/api';

/**
 * Slim Follow / Following button. Vault subscribe popup removed per D-4 —
 * the backend Subscription model still exists, but no UI exposes it during
 * MVP. Re-introduce when monetisation is on the roadmap again.
 */
export default function FollowButton({ userId, profile }) {
  const [status, setStatus] = useState(profile?.follow_status || 'none');
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    try {
      await api.post(`/follow/${userId}`);
      setStatus(profile?.auto_accept_followers ? 'active' : 'pending');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to follow');
    } finally {
      setLoading(false);
    }
  };

  const handleUnfollow = async () => {
    setLoading(true);
    try {
      await api.delete(`/follow/${userId}`);
      setStatus('none');
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  if (status === 'pending') {
    return (
      <button
        onClick={handleUnfollow}
        disabled={loading}
        className="px-4 py-2.5 rounded-lg text-xs font-medium border cursor-pointer min-h-[44px]"
        style={{ backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--text-muted)' }}
      >
        Requested
      </button>
    );
  }

  if (status === 'active') {
    return (
      <button
        onClick={handleUnfollow}
        disabled={loading}
        className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer"
        style={{ backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
      >
        <Check size={12} /> Following
      </button>
    );
  }

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className="px-4 py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer min-h-[44px]"
      style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
    >
      {loading ? '...' : 'Follow'}
    </button>
  );
}
