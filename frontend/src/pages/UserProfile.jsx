import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Settings, RefreshCw } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import NoteCard from '../components/NoteCard';
import FollowButton from '../components/FollowButton';

/* ── Design tokens (STAK system) ── */
const T = {
  bg: '#F6F7FB', card: '#FFFFFF', border: '#E6E9F2', surface: '#F1F3F9',
  purple: '#7C5CE0', purpleLight: '#F0EEFF', purpleHover: '#6B4ED0',
  green: '#10B981', greenDark: '#34D399', red: '#EF4444',
  t1: '#111318', t2: '#6B7280', t3: '#9AA1AC', t4: '#CCC',
  shadow: '0 4px 12px rgba(0,0,0,0.04)', shadowH: '0 6px 16px rgba(0,0,0,0.06)',
  heroShadow: '0 8px 24px rgba(26,26,62,0.2)',
};
const GREENS = ['#34D399','#6EE7B7','#A7F3D0','#D1FAE5','#B6F0D8','#86EFAC','#BBF7D0','#ECFDF5'];
const ICON_TINTS = [
  { bg: '#F0EEFF', fg: '#7C5CE0' }, { bg: '#ECFDF5', fg: '#059669' },
  { bg: '#FEF3CD', fg: '#92600A' }, { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#EBEBF0', fg: '#666' }, { bg: '#F0EEFF', fg: '#7C5CE0' },
];

const SHORT = {
  'Prosus N.V': 'Prosus', 'Naspers Limited': 'Naspers', 'Capitec Bank Holdings Limited': 'Capitec',
  'Shoprite Holdings Limited': 'Shoprite', 'Standard Bank Group Limited': 'Standard Bank',
  'Allan Gray Orbis Global Equity Feeder AMETF': 'Allan Gray AGOGE',
  'Coronation Global Emerging Markets Prescient Feeder AMETF': 'Coronation EM',
  'EasyETFs Global Equity Actively Managed ETF': 'EasyETFs Global',
  '36ONE BCI SA Equity Fund Class C': '36ONE SA Equity', 'Merchant West SCI Value Fund': 'Merchant West',
  'Satrix Top 40 ETF': 'Satrix Top 40', 'Satrix S&P 500 ETF': 'Satrix S&P 500',
  'CoreShares S&P 500 ETF': 'CoreShares S&P 500',
};
const shortName = n => SHORT[n] || n?.replace(/ (Limited|Holdings|PLC|Inc|Corporation|N\.V\.?|Group)\.?/gi, '').split(' ').slice(0, 3).join(' ');
const abbrev = n => { const s = shortName(n); return s?.length <= 3 ? s.toUpperCase() : s?.slice(0, 2).toUpperCase(); };

/* ── Donut SVG ── */
function HeroDonut({ segments, totalPL, isPos, holdingCount, highlightIdx, setHighlightIdx }) {
  const R = 100, CX = 130, CY = 130, SW = 36;
  const circ = 2 * Math.PI * R;
  let off = 0;

  return (
    <div style={{ position: 'relative', width: 260, height: 260, flexShrink: 0 }}>
      <svg width="260" height="260" viewBox="0 0 260 260" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth={SW} />
        {segments.map((s, i) => {
          const arc = (s.weight / 100) * circ;
          const gap = segments.length > 1 ? 1.5 : 0;
          const da = `${Math.max(arc - gap, 1)} ${circ - Math.max(arc - gap, 1)}`;
          const seg = (
            <circle key={s.id} cx={CX} cy={CY} r={R} fill="none"
              stroke={GREENS[i % GREENS.length]} strokeWidth={highlightIdx === i ? SW + 6 : SW}
              strokeDasharray={da} strokeDashoffset={-off} strokeLinecap="round"
              style={{ opacity: highlightIdx !== null && highlightIdx !== i ? 0.25 : 1, transition: 'stroke-width 200ms ease, opacity 200ms ease', cursor: 'pointer' }}
              onMouseEnter={() => setHighlightIdx(i)} onMouseLeave={() => setHighlightIdx(null)}
            />
          );
          off += arc;
          return seg;
        })}
      </svg>
      {/* Centre text */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none', transition: 'opacity 200ms' }}>
        {highlightIdx === null ? (
          <>
            <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -1.5, color: '#fff', lineHeight: 1 }}>
              {totalPL !== null ? `${isPos ? '+' : '\u2212'}${Math.abs(totalPL).toFixed(1)}%` : '0.0%'}
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.greenDark, marginTop: 4 }}>all time</div>
            <div style={{ fontSize: 10, color: '#4A4A6A', marginTop: 3 }}>{holdingCount} holdings</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{shortName(segments[highlightIdx]?.stock_name)}</div>
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1, color: GREENS[highlightIdx % GREENS.length], marginTop: 2 }}>
              {segments[highlightIdx]?.weight.toFixed(1)}%
            </div>
            <div style={{ fontSize: 12, fontWeight: 500, color: T.greenDark, marginTop: 2 }}>
              {segments[highlightIdx]?.pnl !== null ? `${segments[highlightIdx].pnl >= 0 ? '+' : ''}${segments[highlightIdx].pnl.toFixed(1)}%` : ''}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState('notes');
  const [loading, setLoading] = useState(true);
  const [highlightIdx, setHighlightIdx] = useState(null);

  const isOwnProfile = currentUser && String(currentUser.id) === String(userId);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get(`/profile/${userId}`),
      api.get(`/portfolio/user/${userId}`),
      api.get(`/notes/user/${userId}`),
    ])
      .then(([p, h, n]) => { setProfile(p.data); setHoldings(h.data); setNotes(n.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !profile) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: T.border, borderTopColor: 'transparent' }} />
    </div>
  );

  /* ── Calculations ── */
  const totalVal = holdings.reduce((s, h) => s + (h.current_value || 0), 0);
  const totalCost = holdings.reduce((s, h) => s + (h.purchase_value || 0), 0);
  const totalPL = totalCost > 0 ? (totalVal - totalCost) / totalCost * 100 : null;
  const isPos = totalPL !== null && totalPL >= 0;

  const withWeights = holdings.map(h => {
    const hasPrice = h.current_value && h.purchase_value && Math.abs(h.current_value - h.purchase_value) > 1;
    const pnl = hasPrice ? (h.current_value - h.purchase_value) / h.purchase_value * 100 : null;
    const weight = totalVal > 0 && h.current_value ? h.current_value / totalVal * 100 : 0;
    return { ...h, pnl, hasPrice, weight };
  }).sort((a, b) => b.weight - a.weight);

  const segments = withWeights.filter(h => h.weight > 0);

  const priced = holdings.filter(h => h.current_value && h.purchase_value && Math.abs(h.current_value - h.purchase_value) > 1);
  const winning = priced.filter(h => h.current_value >= h.purchase_value).length;
  const best = priced.reduce((b, h) => {
    const p = (h.current_value - h.purchase_value) / h.purchase_value * 100;
    return (!b || p > b.pnl) ? { name: shortName(h.stock_name), pnl: p } : b;
  }, null);

  const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: T.shadow };

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 16px 120px' }}>

        {/* ── 3-column grid (desktop) / single column (mobile) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr)', gap: 20 }}
          className="md:!grid-cols-[260px_1fr_280px]">

          {/* === LEFT SIDEBAR (desktop only) === */}
          <div className="hidden md:flex flex-col gap-4">
            {/* Quick stats */}
            <div style={{ ...card, padding: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: T.t1, marginBottom: 12 }}>Quick stats</div>
              {[
                ['Holdings', String(holdings.length)],
                ['Win rate', `${winning}/${priced.length}`],
                ['Trades', String(holdings.reduce((s, h) => s + (h.trade_count || 0), 0) || '—')],
              ].map(([l, v], i) => (
                <div key={i}>
                  {i > 0 && <div style={{ height: 1, background: T.border, margin: '4px 0' }} />}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13 }}>
                    <span style={{ color: T.t3 }}>{l}</span>
                    <span style={{ color: T.t1, fontWeight: 500 }}>{v}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Best performer */}
            {best && (
              <div style={{ background: '#ECFDF5', borderRadius: 14, padding: '14px 16px' }}>
                <div style={{ fontSize: 11, color: T.t3, marginBottom: 6 }}>Best performer</div>
                <div style={{ fontSize: 18, fontWeight: 600, color: T.t1 }}>{best.name}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: T.green }}>+{best.pnl.toFixed(1)}% all time</div>
              </div>
            )}
          </div>

          {/* === CENTRE COLUMN === */}
          <div className="flex flex-col gap-5">

            {/* Profile header */}
            <div style={{ ...card, padding: 24 }}>
              <div style={{ display: 'flex', gap: 18, marginBottom: 16 }}>
                <div style={{ width: 72, height: 72, borderRadius: '50%', background: T.purpleLight, color: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, fontWeight: 700, flexShrink: 0 }}>
                  {profile.display_name?.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{ fontSize: 20, fontWeight: 700, color: T.t1 }}>{profile.display_name}</span>
                    {profile.portfolio_imported_at && (
                      <div style={{ width: 16, height: 16, borderRadius: '50%', background: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="9" height="9" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6.5 11.1 2.7 7.3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: T.t3, marginBottom: 8 }}>@{profile.handle}</div>
                  {profile.bio && <div style={{ fontSize: 13, color: T.t2, lineHeight: 1.5, marginBottom: 12 }}>{profile.bio}</div>}
                  <div style={{ display: 'flex', gap: 20, marginBottom: 14 }}>
                    <div style={{ fontSize: 13, color: T.t3 }}><strong style={{ color: T.t1 }}>{profile.follower_count || 0}</strong> followers</div>
                    <div style={{ fontSize: 13, color: T.t3 }}><strong style={{ color: T.t1 }}>{profile.following_count || 0}</strong> following</div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {profile.portfolio_imported_at && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 500, background: '#ECFDF5', color: '#059669' }}>
                        <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6.5 11.1 2.7 7.3" stroke="#059669" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        EE verified
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {isOwnProfile ? (
                      <Link to="/profile" className="no-underline" style={{ border: `1.5px solid ${T.border}`, borderRadius: 12, padding: '10px 20px', fontSize: 13, fontWeight: 500, color: T.t1, background: T.card, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <Settings size={14} /> Edit profile
                      </Link>
                    ) : (
                      <>
                        <FollowButton userId={profile.id} profile={profile} />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Hero donut card */}
            {segments.length > 0 && (
              <div style={{
                background: 'linear-gradient(155deg, #1A1A3E 0%, #1E1E4A 45%, #181840 100%)',
                borderRadius: 20, boxShadow: T.heroShadow, overflow: 'hidden',
              }}>
                <div style={{ padding: '24px 28px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#8080A8', letterSpacing: 0.2 }}>Portfolio allocation</span>
                  <span style={{ fontSize: 10, padding: '3px 9px', borderRadius: 8, background: 'rgba(16,185,129,0.12)', color: '#34D399', fontWeight: 600 }}>
                    EE verified
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', padding: '20px 28px 24px', gap: 32, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <HeroDonut segments={segments} totalPL={totalPL} isPos={isPos} holdingCount={holdings.length}
                    highlightIdx={highlightIdx} setHighlightIdx={setHighlightIdx} />

                  {/* Legend */}
                  <div style={{ flex: 1, minWidth: 180, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {segments.map((s, i) => (
                      <div key={s.id} style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 10,
                        cursor: 'pointer', transition: 'background 150ms, opacity 200ms',
                        background: highlightIdx === i ? 'rgba(255,255,255,0.06)' : 'transparent',
                        opacity: highlightIdx !== null && highlightIdx !== i ? 0.35 : 1,
                      }}
                        onMouseEnter={() => setHighlightIdx(i)} onMouseLeave={() => setHighlightIdx(null)}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: GREENS[i % GREENS.length], flexShrink: 0 }} />
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#E0E0F0', flex: 1 }}>{shortName(s.stock_name)}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', minWidth: 48, textAlign: 'right' }}>{s.weight.toFixed(1)}%</div>
                        <div style={{ fontSize: 11, fontWeight: 500, minWidth: 42, textAlign: 'right', color: s.pnl !== null && s.pnl >= 0 ? T.greenDark : '#F87171' }}>
                          {s.pnl !== null ? `${s.pnl >= 0 ? '+' : ''}${s.pnl.toFixed(1)}%` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Footer stats */}
                <div style={{ background: 'rgba(255,255,255,0.04)', borderTop: '0.5px solid rgba(255,255,255,0.06)', padding: '14px 28px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr' }}>
                  {[
                    { l: 'Holdings', v: String(holdings.length) },
                    { l: 'Win rate', v: `${winning}/${priced.length}` },
                    { l: 'Best', v: best ? `${best.name.split(' ')[0]} +${best.pnl.toFixed(1)}%` : '—', green: true },
                    { l: 'Since', v: profile.portfolio_imported_at ? new Date(profile.portfolio_imported_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' }) : '—' },
                  ].map((s, i) => (
                    <div key={i} style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 10, color: '#8080A8', marginBottom: 3 }}>{s.l}</div>
                      <div style={{ fontSize: s.green ? 13 : 16, fontWeight: 700, color: s.green ? T.greenDark : '#fff' }}>{s.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Holdings card */}
            {withWeights.length > 0 && (
              <div style={{ ...card, padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>Holdings</div>
                </div>
                {withWeights.map((h, i) => {
                  const tint = ICON_TINTS[i % ICON_TINTS.length];
                  const pos = h.pnl !== null && h.pnl >= 0;
                  return (
                    <Link key={h.id} to={`/stock/${h.contract_code}?name=${encodeURIComponent(h.stock_name)}`} className="block no-underline">
                      <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                        transition: 'background 150ms',
                        background: highlightIdx === i ? T.purpleLight : 'transparent',
                      }}
                        onMouseEnter={() => setHighlightIdx(i)} onMouseLeave={() => setHighlightIdx(null)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 40, height: 40, borderRadius: 12, background: tint.bg, color: tint.fg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                            {abbrev(h.stock_name)}
                          </div>
                          <div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: T.t1 }}>{shortName(h.stock_name)}</div>
                            <div style={{ fontSize: 11, color: T.t3, marginTop: 1 }}>{h.account_type}</div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          {h.hasPrice ? (
                            <>
                              <div style={{ fontSize: 14, fontWeight: 700, color: T.t1 }}>{h.weight.toFixed(1)}%</div>
                              <div style={{ fontSize: 11, fontWeight: 600, color: pos ? T.green : T.red, marginTop: 1 }}>
                                {pos ? '+' : '\u2212'}{Math.abs(h.pnl).toFixed(1)}%
                              </div>
                            </>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 500, color: T.t3, background: T.surface, borderRadius: 8, padding: '3px 8px' }}>No price</span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Tabs: Notes / Trades */}
            <div style={{ ...card, padding: 0 }}>
              <div style={{ display: 'flex', borderBottom: `1px solid ${T.border}`, padding: '0 20px' }}>
                {['notes', 'trades'].map(t => (
                  <div key={t} onClick={() => setTab(t)} style={{
                    padding: '10px 16px', fontSize: 13, fontWeight: tab === t ? 600 : 500, cursor: 'pointer',
                    color: tab === t ? T.purple : T.t3, borderBottom: `2px solid ${tab === t ? T.purple : 'transparent'}`,
                    transition: 'all 150ms', textTransform: 'capitalize',
                  }}>{t}</div>
                ))}
              </div>
              <div style={{ padding: notes.length > 0 ? 0 : 20 }}>
                {tab === 'notes' && (
                  notes.length > 0
                    ? notes.map(n => <NoteCard key={n.id} note={n} />)
                    : <p style={{ fontSize: 13, color: T.t3, textAlign: 'center' }}>No notes yet</p>
                )}
                {tab === 'trades' && (
                  <p style={{ fontSize: 13, color: T.t3, textAlign: 'center', padding: 20 }}>Coming soon</p>
                )}
              </div>
            </div>
          </div>

          {/* === RIGHT SIDEBAR (desktop only) === */}
          <div className="hidden md:flex flex-col gap-4">
            {/* Vault CTA */}
            <div style={{ ...card, padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>Vault</div>
                <span style={{ fontSize: 10, fontWeight: 500, padding: '4px 10px', borderRadius: 8, background: T.purpleLight, color: T.purple }}>Coming soon</span>
              </div>
              <p style={{ fontSize: 12, color: T.t2, lineHeight: 1.5, marginBottom: 12 }}>
                Exclusive notes, trade reasoning, and AI portfolio comparison.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Responsive grid override */}
      <style>{`
        @media (min-width: 768px) {
          .md\\:!grid-cols-\\[260px_1fr_280px\\] { grid-template-columns: 260px 1fr 280px !important; }
        }
      `}</style>
    </div>
  );
}
