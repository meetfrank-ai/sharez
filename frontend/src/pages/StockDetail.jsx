import { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { Send, AlertTriangle, Sparkles, TrendingUp, TrendingDown, Share2, BookmarkPlus } from 'lucide-react';
import { LineChart, Line, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import NoteCard from '../components/NoteCard';
import NoteComposer from '../components/NoteComposer';
import TierBadge from '../components/TierBadge';
import ThesisCard from '../components/ThesisCard';

const PILL_COLORS = {
  positive: { bg: '#E1F5EE', text: '#0F6E56' },
  caution: { bg: '#FAEEDA', text: '#854F0B' },
  neutral: { bg: '#E6F1FB', text: '#185FA5' },
};

export default function StockDetail() {
  const { contractCode } = useParams();
  const [searchParams] = useSearchParams();
  const stockName = searchParams.get('name') || contractCode;
  const viewingUserId = searchParams.get('user');
  const { user: currentUser } = useAuth();
  const isOwnStock = !viewingUserId || viewingUserId === String(currentUser?.id);

  const [summary, setSummary] = useState(null);
  const [theses, setTheses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState('summary');
  const [newThesis, setNewThesis] = useState('');
  const [thesisVisibility, setThesisVisibility] = useState('inner_circle');
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [posting, setPosting] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [sort, setSort] = useState('recent');
  const [people, setPeople] = useState(viewingUserId ? 'user' : 'everyone');
  const [followingStock, setFollowingStock] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  // 'user' = specific user only, 'following' = people I follow, 'everyone' = all

  const fetchContent = (s = sort, p = people) => {
    if (p === 'user' && viewingUserId) {
      // Filtered to specific user
      api.get(`/theses/user/${viewingUserId}`).then((res) => {
        let filtered = res.data.filter(t => t.contract_code === contractCode);
        if (s === 'oldest') filtered.reverse();
        setTheses(filtered);
      }).catch(() => {});
      api.get(`/notes/user/${viewingUserId}`).then((res) => {
        let filtered = res.data.filter(n => n.stock_tag === contractCode);
        if (s === 'oldest') filtered.reverse();
        setNotes(filtered);
      }).catch(() => {});
    } else {
      // Community view
      const pParam = p === 'following' ? 'following' : 'everyone';
      api.get(`/theses/stock/${contractCode}?sort=${s}&people=${pParam}`).then((res) => setTheses(res.data)).catch(() => {});
      api.get(`/notes/stock/${contractCode}?sort=${s}&people=${pParam}`).then((res) => setNotes(res.data)).catch(() => {});
    }
  };

  useEffect(() => {
    api.get(`/feed/stock-summary?contract_code=${contractCode}&stock_name=${encodeURIComponent(stockName)}`)
      .then((res) => setSummary(res.data))
      .catch(() => setSummary(null))
      .finally(() => setLoadingSummary(false));

    if (viewingUserId) {
      api.get(`/profile/${viewingUserId}`).then((res) => setViewingUser(res.data)).catch(() => {});
    }
    // Check if following this stock
    api.get('/portfolio/followed-stocks').then((res) => {
      setFollowingStock(res.data.some(s => s.contract_code === contractCode));
    }).catch(() => {});
    fetchContent();
  }, [contractCode, stockName, viewingUserId]);

  const handleSortChange = (s) => { setSort(s); fetchContent(s, people); };
  const handlePeopleChange = (p) => { setPeople(p); fetchContent(sort, p); };

  const handlePostThesis = async (e) => {
    e.preventDefault();
    if (!newThesis.trim()) return;
    setPosting(true);
    try {
      const res = await api.post('/theses/', { contract_code: contractCode, stock_name: stockName, body: newThesis, visibility: thesisVisibility });
      setTheses([res.data, ...theses]);
      setNewThesis('');
    } catch { alert('Failed to post thesis'); }
    finally { setPosting(false); }
  };

  const priceData = summary?.market_data || {};
  const changePositive = (priceData.change_pct || 0) >= 0;

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">

      {/* Stock Header */}
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            {stockName?.slice(0, 3).toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{stockName}</h1>
            <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
              {priceData.ticker || 'JSE'} · Equities
            </p>
          </div>
          {priceData.price && (
            <div className="text-right">
              <p className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                R{typeof priceData.price === 'number' ? priceData.price.toLocaleString() : priceData.price}
              </p>
              <p className="text-xs m-0" style={{ color: changePositive ? 'var(--success)' : 'var(--danger)' }}>
                {changePositive ? '+' : ''}{priceData.change_pct ? `${(priceData.change_pct * (Math.abs(priceData.change_pct) < 1 ? 100 : 1)).toFixed(2)}%` : ''}
              </p>
            </div>
          )}
        </div>

        {/* Mini sparkline */}
        {summary?.sparkline?.length > 1 && (
          <div style={{ height: 48, margin: '0 -8px' }}>
            <ResponsiveContainer width="100%" height={48}>
              <LineChart data={summary.sparkline.map((v, i) => ({ v, i }))}>
                <Line type="monotone" dataKey="v" stroke={changePositive ? '#10B981' : '#EF4444'} strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Community Bar */}
      {summary?.community && (summary.community.total_holders > 0 || summary.community.recent_buys > 0) && (() => {
        const AVATAR_COLORS = ['#7F77DD', '#D85A30', '#1D9E75', '#378ADD', '#D4537E', '#639922', '#BA7517', '#534AB7'];
        const getColor = (id) => AVATAR_COLORS[(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];
        const c = summary.community;
        const holders = c.following_holders || [];

        return (
          <div className="rounded-lg mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '0.5px solid var(--border)', padding: '12px 14px' }}>
            {/* Header: label + inline stats */}
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                People you follow
              </span>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {c.total_holders} holding
                {c.recent_buys > 0 && ` · ${c.recent_buys} bought recently`}
                {c.recent_sells > 0 && ` · ${c.recent_sells} sold recently`}
              </span>
            </div>

            {/* Avatar stack */}
            {holders.length > 0 && (
              <div className="flex items-center mb-2">
                <div className="flex">
                  {holders.slice(0, 4).map((h, i) => (
                    <Link key={h.id} to={`/user/${h.id}`} className="no-underline" style={{ zIndex: 5 - i, marginRight: '-6px' }}>
                      <div className="flex items-center justify-center rounded-full text-white font-medium"
                        style={{
                          width: 28, height: 28, fontSize: 10,
                          backgroundColor: getColor(h.id),
                          border: '2px solid var(--bg-card)',
                        }}>
                        {h.display_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                    </Link>
                  ))}
                  {holders.length > 4 && (
                    <div className="flex items-center justify-center rounded-full font-medium"
                      style={{
                        width: 28, height: 28, fontSize: 10, zIndex: 1,
                        backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)',
                        border: '2px solid var(--bg-card)',
                      }}>
                      +{holders.length - 4}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Account breakdown */}
            {c.account_breakdown && Object.keys(c.account_breakdown).length > 0 && (
              <div className="flex gap-2">
                {Object.entries(c.account_breakdown).map(([type, count]) => (
                  <span key={type} className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-secondary)' }}>
                    {type}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex gap-1.5 mb-4">
        {['summary', 'notes'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-medium capitalize border-none cursor-pointer"
            style={{
              backgroundColor: tab === t ? 'var(--accent-light)' : 'var(--bg-card)',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${tab === t ? '#C7D2FE' : 'var(--border)'}`,
            }}>
            {t === 'summary' ? 'AI Summary' : t}
          </button>
        ))}
      </div>

      {/* Sort/Filter bar is rendered inside each tab */}

      {/* === AI SUMMARY TAB === */}
      {tab === 'summary' && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          {loadingSummary ? (
            <div className="flex items-center justify-center h-20">
              <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
            </div>
          ) : !summary ? (
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Summary unavailable</p>
          ) : (
            <>
              {/* AI badge */}
              <div className="flex items-center gap-1.5 mb-3">
                <div className="w-5 h-5 rounded-md flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg, #7F77DD, #378ADD)' }}>
                  <Sparkles size={11} color="#fff" />
                </div>
                <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>AI Summary</span>
              {summary?.updated_ago && (
                <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>Updated {summary.updated_ago}</span>
              )}
              </div>

              {/* Quick take */}
              <p className="text-sm leading-relaxed mb-4 m-0" style={{ color: 'var(--text-primary)' }}>
                {summary.quick_take}
              </p>

              {/* Sentiment pills */}
              {summary.sentiment_tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {summary.sentiment_tags.map((tag, i) => {
                    const colors = PILL_COLORS[tag.type] || PILL_COLORS.neutral;
                    return (
                      <span key={i} className="text-[11px] font-medium px-2.5 py-1 rounded-full"
                        style={{ backgroundColor: colors.bg, color: colors.text }}>
                        {tag.label}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Why people invest */}
              {summary.why_people_invest?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider mb-2 m-0" style={{ color: 'var(--text-muted)' }}>
                    Why people invest
                  </p>
                  <div className="space-y-1.5">
                    {summary.why_people_invest.map((r, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <div className="w-full max-w-[140px] h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-hover)' }}>
                          <div className="h-full rounded-full" style={{
                            width: `${r.pct}%`,
                            backgroundColor: i === 0 ? 'var(--success)' : i === 1 ? 'var(--accent)' : '#7F77DD',
                          }} />
                        </div>
                        <span className="text-xs whitespace-nowrap" style={{ color: 'var(--text-primary)' }}>{r.reason}</span>
                        <span className="text-[11px] ml-auto" style={{ color: 'var(--text-muted)' }}>{r.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Key metrics */}
              {summary.key_metrics?.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {summary.key_metrics.slice(0, 3).map((m, i) => (
                    <div key={i} className="rounded-lg p-2.5 text-center" style={{ backgroundColor: 'var(--bg-page)' }}>
                      <p className="text-[10px] m-0 mb-0.5" style={{ color: 'var(--text-muted)' }}>{m.label}</p>
                      <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{m.value}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* News digest */}
              {summary.news_digest?.length > 0 && (
                <div className="mb-4">
                  <p className="text-[11px] font-medium uppercase tracking-wider mb-2 m-0" style={{ color: 'var(--text-muted)' }}>
                    News digest
                  </p>
                  <div className="space-y-1.5">
                    {summary.news_digest.map((n, i) => (
                      <div key={i} className="flex gap-2 items-baseline">
                        <span className="text-[11px] whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>{n.time}</span>
                        <span className="text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>{n.headline}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Risk note */}
              {summary.risk_note && (
                <div className="rounded-lg p-3 flex gap-2 items-start" style={{ backgroundColor: '#FAEEDA' }}>
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" style={{ color: '#854F0B' }} />
                  <div>
                    <p className="text-xs font-medium m-0 mb-0.5" style={{ color: '#854F0B' }}>Risk note</p>
                    <p className="text-xs leading-relaxed m-0" style={{ color: '#854F0B', opacity: 0.85 }}>{summary.risk_note}</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* === THESES TAB === */}
      {tab === 'theses' && (
        <>
          {/* Filter bar inside tab */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex gap-1">
              {['recent', 'oldest'].map((s) => (
                <button key={s} onClick={() => handleSortChange(s)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium capitalize border-none cursor-pointer"
                  style={{ backgroundColor: sort === s ? 'var(--accent-light)' : 'transparent', color: sort === s ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex gap-1">
              {viewingUser && (
                <button onClick={() => handlePeopleChange('user')}
                  className="px-2.5 py-1 rounded-md text-xs font-medium border-none cursor-pointer"
                  style={{ backgroundColor: people === 'user' ? 'var(--accent-light)' : 'transparent', color: people === 'user' ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {viewingUser.display_name?.split(' ')[0]}
                </button>
              )}
              <button onClick={() => handlePeopleChange('following')}
                className="px-2.5 py-1 rounded-md text-xs font-medium border-none cursor-pointer"
                style={{ backgroundColor: people === 'following' ? 'var(--accent-light)' : 'transparent', color: people === 'following' ? 'var(--accent)' : 'var(--text-muted)' }}>
                Following
              </button>
              <button onClick={() => handlePeopleChange('everyone')}
                className="px-2.5 py-1 rounded-md text-xs font-medium border-none cursor-pointer"
                style={{ backgroundColor: people === 'everyone' ? 'var(--accent-light)' : 'transparent', color: people === 'everyone' ? 'var(--accent)' : 'var(--text-muted)' }}>
                Everyone
              </button>
            </div>
          </div>

          {isOwnStock && (
            <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <h3 className="text-sm font-semibold mb-3 m-0" style={{ color: 'var(--text-primary)' }}>Share your thesis</h3>
              <form onSubmit={handlePostThesis}>
                <textarea value={newThesis} onChange={(e) => setNewThesis(e.target.value)} placeholder="Why did you buy this stock?" rows={3}
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2"
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                <div className="flex items-center justify-between">
                  <select value={thesisVisibility} onChange={(e) => setThesisVisibility(e.target.value)}
                    className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
                    style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    <option value="public">Public</option>
                    <option value="inner_circle">Inner Circle</option>
                    <option value="vault">Vault</option>
                  </select>
                  <button type="submit" disabled={posting || !newThesis.trim()}
                    className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 border-none cursor-pointer"
                    style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                    <Send size={13} />{posting ? '...' : 'Post'}
                  </button>
                </div>
              </form>
            </div>
          )}
          {theses.length === 0 ? (
            <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {people === 'user' && viewingUser ? `${viewingUser.display_name} hasn't posted a thesis on this stock` : 'No theses yet'}
            </p>
          ) : theses.map((t) => <ThesisCard key={t.id} thesis={t} />)}
        </>
      )}

      {/* === NOTES TAB === */}
      {tab === 'notes' && (
        <>
          {/* Filter bar inside tab */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <div className="flex gap-1">
              {['recent', 'oldest'].map((s) => (
                <button key={s} onClick={() => handleSortChange(s)}
                  className="px-2.5 py-1 rounded-md text-xs font-medium capitalize border-none cursor-pointer"
                  style={{ backgroundColor: sort === s ? 'var(--accent-light)' : 'transparent', color: sort === s ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {s}
                </button>
              ))}
            </div>
            <div className="w-px h-4" style={{ backgroundColor: 'var(--border)' }} />
            <div className="flex gap-1">
              {viewingUser && (
                <button onClick={() => handlePeopleChange('user')}
                  className="px-2.5 py-1 rounded-md text-xs font-medium border-none cursor-pointer"
                  style={{ backgroundColor: people === 'user' ? 'var(--accent-light)' : 'transparent', color: people === 'user' ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {viewingUser.display_name?.split(' ')[0]}
                </button>
              )}
              <button onClick={() => handlePeopleChange('following')}
                className="px-2.5 py-1 rounded-md text-xs font-medium border-none cursor-pointer"
                style={{ backgroundColor: people === 'following' ? 'var(--accent-light)' : 'transparent', color: people === 'following' ? 'var(--accent)' : 'var(--text-muted)' }}>
                Following
              </button>
              <button onClick={() => handlePeopleChange('everyone')}
                className="px-2.5 py-1 rounded-md text-xs font-medium border-none cursor-pointer"
                style={{ backgroundColor: people === 'everyone' ? 'var(--accent-light)' : 'transparent', color: people === 'everyone' ? 'var(--accent)' : 'var(--text-muted)' }}>
                Everyone
              </button>
            </div>
          </div>

          {isOwnStock && <NoteComposer stockTag={contractCode} stockName={stockName} onPosted={(n) => setNotes([n, ...notes])} />}
          {notes.length === 0 ? (
            <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {people === 'user' && viewingUser ? `${viewingUser.display_name} hasn't posted notes on this stock` : 'No notes yet'}
            </p>
          ) : notes.map((n) => <NoteCard key={n.id} note={n} />)}
        </>
      )}

      {/* Action buttons */}
      <div className="flex gap-2 mt-5">
        <button
          onClick={async () => {
            setFollowLoading(true);
            try {
              if (followingStock) {
                await api.delete(`/portfolio/follow-stock/${contractCode}`);
                setFollowingStock(false);
              } else {
                await api.post(`/portfolio/follow-stock/${contractCode}?stock_name=${encodeURIComponent(stockName)}`);
                setFollowingStock(true);
              }
            } catch {} finally { setFollowLoading(false); }
          }}
          disabled={followLoading}
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium border-none cursor-pointer transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{
            backgroundColor: followingStock ? 'var(--bg-card)' : 'var(--text-primary)',
            color: followingStock ? 'var(--text-primary)' : 'var(--bg-card)',
            border: followingStock ? '1px solid var(--border)' : 'none',
          }}
        >
          <BookmarkPlus size={16} /> {followingStock ? 'Following stock' : 'Follow stock'}
        </button>
        <button
          className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-lg text-sm font-medium cursor-pointer transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}
        >
          <Share2 size={16} /> Share
        </button>
      </div>
    </div>
  );
}
