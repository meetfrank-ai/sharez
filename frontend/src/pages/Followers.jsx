import { useState, useEffect } from 'react';
import { Check, X, Crown } from 'lucide-react';
import api from '../utils/api';
import TierBadge from '../components/TierBadge';

export default function Followers() {
  const [followers, setFollowers] = useState([]);
  const [following, setFollowing] = useState([]);
  const [tab, setTab] = useState('followers');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/followers'), api.get('/following')])
      .then(([f, g]) => { setFollowers(f.data); setFollowing(g.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleApprove = async (id) => { try { await api.put(`/follow/${id}/approve`); setFollowers((p) => p.map((f) => f.follower_id === id ? { ...f, status: 'active' } : f)); } catch {} };
  const handleReject = async (id) => { try { await api.put(`/follow/${id}/reject`); setFollowers((p) => p.map((f) => f.follower_id === id ? { ...f, status: 'rejected' } : f)); } catch {} };
  const handleGrantVIP = async (id) => { try { await api.put(`/follow/${id}/grant-vip`); setFollowers((p) => p.map((f) => f.follower_id === id ? { ...f, is_vip: true } : f)); } catch {} };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
    </div>;
  }

  const pending = followers.filter((f) => f.status === 'pending');
  const active = followers.filter((f) => f.status === 'active');

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold mb-5 m-0" style={{ color: 'var(--text-primary)' }}>Connections</h1>

      <div className="flex gap-1.5 mb-5">
        {['followers', 'following'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
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

      {tab === 'followers' && (
        <>
          {pending.length > 0 && (
            <>
              <h2 className="text-xs font-semibold mb-2 uppercase tracking-wider" style={{ color: 'var(--tier-vault)' }}>Pending Requests</h2>
              {pending.map((f) => (
                <div key={f.id} className="rounded-xl p-4 mb-2 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                    {f.display_name?.charAt(0).toUpperCase()}
                  </div>
                  <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.display_name}</span>
                  <button onClick={() => handleApprove(f.follower_id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border-none cursor-pointer"
                    style={{ backgroundColor: '#D1FAE5', color: 'var(--success)' }}><Check size={14} /></button>
                  <button onClick={() => handleReject(f.follower_id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center border-none cursor-pointer"
                    style={{ backgroundColor: '#FEE2E2', color: 'var(--danger)' }}><X size={14} /></button>
                </div>
              ))}
            </>
          )}

          <h2 className="text-xs font-semibold mb-2 mt-4 uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            Followers ({active.length})
          </h2>
          {active.map((f) => (
            <div key={f.id} className="rounded-xl p-4 mb-2 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                {f.display_name?.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>{f.display_name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <TierBadge tier={f.is_vip ? 'vault' : f.tier} />
                  {f.is_vip && <span className="text-[10px] font-medium" style={{ color: 'var(--tier-vault)' }}>VIP</span>}
                </div>
              </div>
              {!f.is_vip && (
                <button onClick={() => handleGrantVIP(f.follower_id)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer"
                  style={{ backgroundColor: '#FFFBEB', color: 'var(--tier-vault)' }}>
                  <Crown size={12} /> Grant VIP
                </button>
              )}
            </div>
          ))}
        </>
      )}

      {tab === 'following' && (
        following.length === 0
          ? <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>Not following anyone yet</p>
          : following.map((f) => (
            <div key={f.id} className="rounded-xl p-4 mb-2 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                {f.display_name?.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{f.display_name}</span>
              <TierBadge tier={f.tier} />
            </div>
          ))
      )}
    </div>
  );
}
