import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Check, X, Crown, ChevronDown, Users, Eye, Lock } from 'lucide-react';
import api from '../utils/api';
import TierBadge from '../components/TierBadge';

const AVATAR_COLORS = ['#7F77DD', '#D85A30', '#1D9E75', '#378ADD', '#D4537E', '#639922', '#BA7517', '#534AB7'];
const getColor = (id) => AVATAR_COLORS[(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

export default function Followers() {
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [tab, setTab] = useState('followers');
  const [tierFilter, setTierFilter] = useState('all'); // all, pending, inner_circle, vault
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/followers'), api.get('/following')])
      .then(([f, g]) => { setFollowers(f.data); setFollowing(g.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => {
    try { await api.put(`/follow/${id}/approve`); setFollowers(p => p.map(f => f.follower_id === id ? { ...f, status: 'active' } : f)); } catch {}
  };
  const handleReject = async (id) => {
    try { await api.put(`/follow/${id}/reject`); setFollowers(p => p.filter(f => f.follower_id !== id)); } catch {}
  };
  const handleGrantVIP = async (id) => {
    try { await api.put(`/follow/${id}/grant-vip`); setFollowers(p => p.map(f => f.follower_id === id ? { ...f, is_vip: true, tier: 'vault' } : f)); } catch {}
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
    </div>;
  }

  const pending = followers.filter(f => f.status === 'pending');
  const active = followers.filter(f => f.status === 'active');
  const innerCircle = active.filter(f => !f.is_vip && f.tier !== 'vault');
  const vaultMembers = active.filter(f => f.is_vip || f.tier === 'vault');

  // Filter followers based on selected tier
  let displayFollowers = [];
  if (tierFilter === 'all') displayFollowers = [...pending, ...active];
  else if (tierFilter === 'pending') displayFollowers = pending;
  else if (tierFilter === 'inner_circle') displayFollowers = innerCircle;
  else if (tierFilter === 'vault') displayFollowers = vaultMembers;

  const renderPerson = (f, isFollower = true) => {
    const userId = isFollower ? f.follower_id : f.following_id;
    const isPending = f.status === 'pending';
    const isVault = f.is_vip || f.tier === 'vault';

    return (
      <div key={f.id} className="flex items-center gap-3 px-4 py-3"
        style={{ borderBottom: '1px solid var(--border)' }}>
        <Link to={`/user/${userId}`} className="no-underline shrink-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: getColor(userId) }}>
            {f.display_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <Link to={`/user/${userId}`} className="no-underline">
            <p className="text-sm font-medium m-0 truncate" style={{ color: 'var(--text-primary)' }}>{f.display_name}</p>
          </Link>
          <div className="flex items-center gap-1.5 mt-0.5">
            {isPending ? (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}>Pending</span>
            ) : (
              <TierBadge tier={isVault ? 'vault' : 'inner_circle'} />
            )}
            {isVault && !isPending && <span className="text-[10px] font-medium" style={{ color: 'var(--tier-vault)' }}>VIP</span>}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          {isPending && isFollower && (
            <>
              <button onClick={() => handleApprove(f.follower_id)}
                className="w-11 h-11 rounded-lg flex items-center justify-center border-none cursor-pointer"
                style={{ backgroundColor: '#D1FAE5', color: 'var(--success)' }}><Check size={16} /></button>
              <button onClick={() => handleReject(f.follower_id)}
                className="w-11 h-11 rounded-lg flex items-center justify-center border-none cursor-pointer"
                style={{ backgroundColor: '#FEE2E2', color: 'var(--danger)' }}><X size={16} /></button>
            </>
          )}
          {!isPending && isFollower && !isVault && (
            <button onClick={() => handleGrantVIP(f.follower_id)}
              className="flex items-center gap-1 px-3 py-2 rounded-md text-[11px] font-medium border-none cursor-pointer min-h-[44px]"
              style={{ backgroundColor: '#FFFBEB', color: 'var(--tier-vault)' }}>
              <Crown size={11} /> VIP
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold mb-5 m-0" style={{ color: 'var(--text-primary)' }}>Connections</h1>

      {/* Main tabs: Followers / Following */}
      <div className="flex gap-1.5 mb-4">
        {['followers', 'following'].map(t => (
          <button key={t} onClick={() => { setTab(t); setTierFilter('all'); }}
            className="flex-1 py-2 rounded-lg text-xs font-medium capitalize border-none cursor-pointer"
            style={{
              backgroundColor: tab === t ? 'var(--accent-light)' : 'var(--bg-card)',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${tab === t ? '#C7D2FE' : 'var(--border)'}`,
            }}>
            {t} ({t === 'followers' ? followers.length : following.length})
          </button>
        ))}
      </div>

      {/* Tier filter pills — followers only */}
      {tab === 'followers' && (
        <div className="flex items-center gap-1.5 mb-4 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {[
            { key: 'all', label: 'All', count: followers.length },
            { key: 'pending', label: 'Requests', count: pending.length, color: '#D97706' },
            { key: 'inner_circle', label: 'Inner Circle', count: innerCircle.length, color: 'var(--tier-inner)' },
            { key: 'vault', label: 'Vault', count: vaultMembers.length, color: 'var(--tier-vault)' },
          ].map(f => (
            <button key={f.key} onClick={() => setTierFilter(f.key)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border-none cursor-pointer"
              style={{
                backgroundColor: tierFilter === f.key ? 'var(--accent-light)' : 'transparent',
                color: tierFilter === f.key ? 'var(--accent)' : 'var(--text-muted)',
                border: tierFilter === f.key ? '1px solid #C7D2FE' : '1px solid var(--border)',
              }}>
              {f.label}
              {f.count > 0 && <span className="w-4 h-4 rounded-full flex items-center justify-center text-[10px]"
                style={{ backgroundColor: f.key === 'pending' && f.count > 0 ? '#FEF3C7' : 'var(--bg-page)', color: f.color || 'var(--text-muted)' }}>
                {f.count}
              </span>}
            </button>
          ))}
        </div>
      )}

      {/* Followers list */}
      {tab === 'followers' && (
        displayFollowers.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Users size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
              {tierFilter === 'pending' ? 'No pending requests' : tierFilter === 'all' ? 'No followers yet' : `No ${tierFilter.replace('_', ' ')} followers`}
            </p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            {displayFollowers.map(f => renderPerson(f, true))}
          </div>
        )
      )}

      {/* Following list */}
      {tab === 'following' && (
        following.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Users size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>Not following anyone yet</p>
          </div>
        ) : (
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            {following.map(f => renderPerson(f, false))}
          </div>
        )
      )}
    </div>
  );
}
