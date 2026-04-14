import { useState } from 'react';
import { Check, Lock, X } from 'lucide-react';
import api from '../utils/api';

const VAULT_LABELS = {
  amounts: 'Exact Rand amounts',
  buy_sell_history: 'Buy/sell transaction history',
  realtime_changes: 'Real-time portfolio changes',
  exclusive_theses: 'Exclusive investment theses',
  exclusive_notes: 'Exclusive notes & insights',
  stock_names: 'Stock names',
  allocation_pct: 'Allocation percentages',
  all_theses: 'All theses',
  all_notes: 'All notes',
  comments: 'Comments',
};

export default function FollowButton({ userId, profile }) {
  const [tier, setTier] = useState(profile?.your_tier);
  const [status, setStatus] = useState(profile?.follow_status || 'none');
  const [loading, setLoading] = useState(false);
  const [showVaultPopup, setShowVaultPopup] = useState(false);

  const vaultPrice = profile?.vault_price_cents || 0;
  const vaultShows = profile?.vault_shows || [];

  const handleFollow = async () => {
    setLoading(true);
    try {
      await api.post(`/follow/${userId}`);
      if (profile?.auto_accept_followers) {
        setTier('public');
        setStatus('active');
      } else {
        setStatus('pending');
      }
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
      setTier('public');
      setStatus('none');
    } catch {} finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async () => {
    setLoading(true);
    try {
      await api.post(`/subscribe/${userId}`);
      setTier('vault');
      setShowVaultPopup(false);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to subscribe');
    } finally {
      setLoading(false);
    }
  };

  // Not following
  if (status === 'none' || (!status && (!tier || tier === 'public'))) {
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

  // Request pending
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

  // Vault member
  if (tier === 'vault') {
    return (
      <button
        onClick={handleUnfollow}
        disabled={loading}
        className="flex items-center gap-1 px-4 py-2.5 rounded-lg text-xs font-semibold border-none cursor-pointer min-h-[44px]"
        style={{ backgroundColor: '#FFFBEB', color: 'var(--tier-vault)', border: '1px solid #FDE68A' }}
      >
        <Lock size={12} /> Vault Member
      </button>
    );
  }

  // Following (inner circle)
  return (
    <>
      <div className="flex gap-2">
        <button
          onClick={handleUnfollow}
          disabled={loading}
          className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer"
          style={{ backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--text-secondary)' }}
        >
          <Check size={12} /> Following
        </button>
        {vaultPrice > 0 && (
          <button
            onClick={() => setShowVaultPopup(true)}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 border-none cursor-pointer"
            style={{ backgroundColor: '#FFFBEB', color: 'var(--tier-vault)' }}
          >
            <Lock size={12} /> Vault R{(vaultPrice / 100).toFixed(0)}/mo
          </button>
        )}
        {vaultPrice === 0 && vaultShows.length > 0 && (
          <span className="flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ backgroundColor: '#F3F4F6', color: 'var(--text-muted)' }}>
            <Lock size={12} /> Invite only
          </span>
        )}
      </div>

      {/* Vault popup */}
      {showVaultPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-full md:max-w-sm rounded-none md:rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Lock size={16} style={{ color: 'var(--tier-vault)' }} />
                <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                  Vault Access
                </h3>
              </div>
              <button onClick={() => setShowVaultPopup(false)} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
              Subscribe to {profile?.display_name}'s vault for exclusive access:
            </p>

            <div className="space-y-2 mb-5">
              {vaultShows.map((key) => (
                <div key={key} className="flex items-center gap-2">
                  <Check size={14} style={{ color: 'var(--success)' }} />
                  <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                    {VAULT_LABELS[key] || key}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-3 mb-4 text-center" style={{ backgroundColor: '#FFFBEB' }}>
              <p className="text-lg font-semibold m-0" style={{ color: 'var(--tier-vault)' }}>
                R{(vaultPrice / 100).toFixed(0)}<span className="text-xs font-normal">/month</span>
              </p>
            </div>

            <button
              onClick={handleSubscribe}
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
              style={{ backgroundColor: 'var(--tier-vault)', color: '#FFFFFF' }}
            >
              {loading ? '...' : 'Subscribe'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
