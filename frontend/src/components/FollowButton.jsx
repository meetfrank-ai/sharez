import { useState } from 'react';
import api from '../utils/api';

export default function FollowButton({ userId, initialTier, vaultPrice }) {
  const [tier, setTier] = useState(initialTier);
  const [loading, setLoading] = useState(false);

  const handleFollow = async () => {
    setLoading(true);
    try {
      await api.post(`/follow/${userId}`);
      setTier('inner_circle');
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
      setTier(null);
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await api.post(`/subscribe/${userId}`);
      setTier('vault');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  if (!tier || tier === 'public') {
    return (
      <button
        onClick={handleFollow}
        disabled={loading}
        className="px-4 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
        style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
      >
        {loading ? '...' : 'Follow'}
      </button>
    );
  }

  if (tier === 'inner_circle') {
    return (
      <div className="flex gap-2">
        <button
          onClick={handleUnfollow}
          disabled={loading}
          className="px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer"
          style={{
            backgroundColor: 'transparent',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          Following
        </button>
        {vaultPrice > 0 && (
          <button
            onClick={handleSubscribe}
            disabled={loading}
            className="px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 border-none cursor-pointer"
            style={{ backgroundColor: '#FFFBEB', color: 'var(--tier-vault)' }}
          >
            Vault R{(vaultPrice / 100).toFixed(0)}/mo
          </button>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={handleUnfollow}
      disabled={loading}
      className="px-4 py-2 rounded-lg text-xs font-semibold border-none cursor-pointer"
      style={{ backgroundColor: '#FFFBEB', color: 'var(--tier-vault)', border: '1px solid #FDE68A' }}
    >
      Vault Member
    </button>
  );
}
