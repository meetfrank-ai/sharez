import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Linkedin, Globe, ExternalLink, TrendingUp, TrendingDown, Shield } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../utils/api';
import NoteCard from '../components/NoteCard';
import TierBadge from '../components/TierBadge';
import FollowButton from '../components/FollowButton';
import ThesisCard from '../components/ThesisCard';

const CHART_COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#D97706', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

export default function UserProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [theses, setTheses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState('portfolio');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/profile/${userId}`),
      api.get(`/portfolio/user/${userId}`),
      api.get(`/theses/user/${userId}`),
      api.get(`/notes/user/${userId}`),
    ])
      .then(([p, h, t, n]) => { setProfile(p.data); setHoldings(h.data); setTheses(t.data); setNotes(n.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  // Calculate portfolio percentages
  const totalValue = holdings.reduce((s, h) => s + (h.current_value || 0), 0);
  const holdingsWithPct = holdings.map(h => ({
    ...h,
    pct: totalValue > 0 && h.current_value ? ((h.current_value / totalValue) * 100) : 0,
    returnPct: h.purchase_value && h.current_value
      ? (((h.current_value - h.purchase_value) / h.purchase_value) * 100)
      : null,
  })).sort((a, b) => b.pct - a.pct);

  // Dual-market split
  const jseSummary = holdingsWithPct.filter(h => h.account_type !== 'USD');
  const usdSummary = holdingsWithPct.filter(h => h.account_type === 'USD');
  const jsePct = jseSummary.reduce((s, h) => s + h.pct, 0);
  const usdPct = usdSummary.reduce((s, h) => s + h.pct, 0);

  // Overall return
  const totalPurchase = holdings.reduce((s, h) => s + (h.purchase_value || 0), 0);
  const overallReturn = totalPurchase > 0 ? (((totalValue - totalPurchase) / totalPurchase) * 100) : null;

  const pieData = holdingsWithPct.filter(h => h.pct > 0).map(h => ({
    name: h.stock_name,
    value: parseFloat(h.pct.toFixed(1)),
  }));

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      {/* Profile Header */}
      <div className="rounded-xl p-6 mb-5 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold mx-auto mb-3"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
          {profile.display_name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-lg font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{profile.display_name}</h2>
        {profile.handle && <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>@{profile.handle}</p>}
        {profile.bio && <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>}

        <div className="flex justify-center gap-5 mt-3 mb-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{profile.follower_count}</strong> followers
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{profile.following_count}</strong> following
          </span>
        </div>

        {/* Social links */}
        {(profile.linkedin_url || profile.twitter_url || profile.website_url) && (
          <div className="flex justify-center gap-3 mb-3">
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center no-underline" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                <Linkedin size={15} />
              </a>
            )}
            {profile.twitter_url && (
              <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center no-underline" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                <ExternalLink size={15} />
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center no-underline" style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                <Globe size={15} />
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <TierBadge tier={profile.your_tier || 'public'} />
          <FollowButton userId={profile.id} profile={profile} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        {['portfolio', 'notes'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all border-none cursor-pointer"
            style={{
              backgroundColor: tab === t ? 'var(--accent-light)' : 'var(--bg-card)',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${tab === t ? '#C7D2FE' : 'var(--border)'}`,
            }}>
            {t}
          </button>
        ))}
      </div>

      {/* === PORTFOLIO TAB === */}
      {tab === 'portfolio' && (
        holdings.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <Shield size={24} className="mx-auto mb-2" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>Portfolio not visible at your access tier</p>
            <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>Follow to see more</p>
          </div>
        ) : (
          <>
            {/* Verified badge */}
            <div className="flex items-center gap-1.5 mb-4">
              <div className="w-4 h-4 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--success)' }}>
                <Shield size={10} color="#fff" />
              </div>
              <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>Verified portfolio · Synced from EasyEquities</span>
            </div>

            {/* Return summary */}
            {overallReturn !== null && (
              <div className="rounded-xl p-4 mb-4 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>All-time return</span>
                <div className="flex items-center gap-1">
                  {overallReturn >= 0
                    ? <TrendingUp size={14} style={{ color: 'var(--success)' }} />
                    : <TrendingDown size={14} style={{ color: 'var(--danger)' }} />
                  }
                  <span className="text-base font-semibold" style={{ color: overallReturn >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                    {overallReturn >= 0 ? '+' : ''}{overallReturn.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {/* Dual-market split */}
            {usdPct > 0 && jsePct > 0 && (
              <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-2 m-0" style={{ color: 'var(--text-muted)' }}>Market Split</p>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                    <div className="h-full rounded-full" style={{ width: `${jsePct}%`, backgroundColor: 'var(--accent)' }} />
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span style={{ color: 'var(--accent)' }}>JSE {jsePct.toFixed(0)}%</span>
                  <span style={{ color: 'var(--tier-vault)' }}>USD {usdPct.toFixed(0)}%</span>
                </div>
              </div>
            )}

            {/* Allocation pie chart + holdings list */}
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              {/* Pie chart */}
              {pieData.length > 0 && (
                <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                  <p className="text-[11px] font-medium uppercase tracking-wider mb-2 m-0" style={{ color: 'var(--text-muted)' }}>Allocation</p>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val) => `${val}%`} contentStyle={{ backgroundColor: '#fff', border: '1px solid #E8ECF1', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Holdings by weight */}
              <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                <p className="text-[11px] font-medium uppercase tracking-wider mb-3 m-0" style={{ color: 'var(--text-muted)' }}>Holdings by weight</p>
                <div className="space-y-2.5">
                  {holdingsWithPct.map((h, i) => (
                    <Link key={h.id} to={`/stock/${h.contract_code}?name=${encodeURIComponent(h.stock_name)}&user=${userId}`} className="no-underline block">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>{h.stock_name}</span>
                            <span className="text-xs font-semibold ml-2" style={{ color: 'var(--text-primary)' }}>{h.pct.toFixed(1)}%</span>
                          </div>
                          <div className="flex items-center justify-between mt-0.5">
                            <div className="flex-1 h-1 rounded-full mr-2 overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                              <div className="h-full rounded-full" style={{ width: `${h.pct}%`, backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                            </div>
                            {h.returnPct !== null && (
                              <span className="text-[10px] font-medium whitespace-nowrap" style={{ color: h.returnPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                                {h.returnPct >= 0 ? '+' : ''}{h.returnPct.toFixed(1)}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            {/* Account type breakdown */}
            <div className="rounded-xl p-4 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <p className="text-[11px] font-medium uppercase tracking-wider mb-2 m-0" style={{ color: 'var(--text-muted)' }}>By Account</p>
              <div className="flex gap-3">
                {['TFSA', 'ZAR', 'USD'].map(type => {
                  const count = holdings.filter(h => h.account_type === type).length;
                  if (count === 0) return null;
                  const typePct = holdingsWithPct.filter(h => h.account_type === type).reduce((s, h) => s + h.pct, 0);
                  return (
                    <div key={type} className="flex-1 rounded-lg p-2.5 text-center" style={{ backgroundColor: 'var(--bg-page)' }}>
                      <p className="text-[10px] m-0 mb-0.5" style={{ color: 'var(--text-muted)' }}>{type}</p>
                      <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{typePct.toFixed(0)}%</p>
                      <p className="text-[10px] m-0" style={{ color: 'var(--text-muted)' }}>{count} stock{count !== 1 ? 's' : ''}</p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Privacy note */}
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={12} style={{ color: 'var(--text-muted)' }} />
              <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Dollar amounts hidden · Showing percentage allocation only
              </span>
            </div>
          </>
        )
      )}

      {/* === NOTES TAB === */}
      {tab === 'notes' && (
        notes.length === 0
          ? <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>No visible notes</p>
          : notes.map((n) => <NoteCard key={n.id} note={n} />)
      )}
    </div>
  );
}
