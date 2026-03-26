import { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

/* ── Design tokens ── */
const T = {
  bg: '#F6F7FB', card: '#FFFFFF', border: '#E6E9F2', surface: '#F1F3F9',
  purple: '#7C5CE0', purpleLight: '#F0EEFF',
  navyStart: '#1A1A3E', navyMid: '#1E1E4A', navyEnd: '#181840',
  green: '#10B981', greenDark: '#34D399', red: '#EF4444',
  text1: '#111318', text2: '#6B7280', text3: '#9AA1AC',
  textWhite: '#FFFFFF', textDarkMuted: '#8080A8', textDarkDim: '#4A4A6A',
  shadow: '0 4px 12px rgba(0,0,0,0.04)', heroShadow: '0 8px 24px rgba(26,26,62,0.2)',
};

/* ── Allocation colours (green gradient for donut per spec) ── */
const ALLOC = ['#34D399','#6EE7B7','#A7F3D0','#D1FAE5','#ECFDF5','#7F77DD','#85B7EB','#D85A30'];

/* ── Display name shortening ── */
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

function formatUpdated(d) {
  if (!d) return 'not synced';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 5) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

/* ── Mini donut (inside hero glass panel) ── */
function MiniDonut({ segments, count }) {
  const R = 24, CX = 32, CY = 32, SW = 8;
  const circ = 2 * Math.PI * R;
  let off = 0;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64">
      <circle cx={CX} cy={CY} r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={SW} />
      <g style={{ transform: 'rotate(-90deg)', transformOrigin: '32px 32px' }}>
        {segments.map((s, i) => {
          const arc = (s.weight / 100) * circ;
          const gap = segments.length > 1 ? 2 : 0;
          const da = `${Math.max(arc - gap, 1)} ${circ - Math.max(arc - gap, 1)}`;
          const seg = <circle key={s.id} cx={CX} cy={CY} r={R} fill="none" stroke={ALLOC[i % ALLOC.length]} strokeWidth={SW} strokeDasharray={da} strokeDashoffset={-off} strokeLinecap="round" />;
          off += arc;
          return seg;
        })}
      </g>
      <text x={CX} y={CY + 1} textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 14, fontWeight: 700, fill: '#FFFFFF' }}>{count}</text>
    </svg>
  );
}

/* ── Tint for holding icons by index ── */
const ICON_TINTS = [
  { bg: '#F0EEFF', fg: '#7C5CE0' }, { bg: '#ECFDF5', fg: '#059669' },
  { bg: '#FEF3CD', fg: '#92600A' }, { bg: '#DBEAFE', fg: '#1D4ED8' },
  { bg: '#EBEBF0', fg: '#666666' }, { bg: '#F0EEFF', fg: '#7C5CE0' },
  { bg: '#ECFDF5', fg: '#059669' }, { bg: '#FEF3CD', fg: '#92600A' },
];

export default function Portfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('weight');
  const [showValues, setShowValues] = useState(true);
  const [ready, setReady] = useState(false);

  const fetchHoldings = () => {
    api.get('/portfolio/me')
      .then(r => setHoldings(r.data))
      .catch(() => {})
      .finally(() => { setLoading(false); setTimeout(() => setReady(true), 50); });
  };
  const handleRefresh = async () => {
    setRefreshing(true);
    try { await api.post('/portfolio/refresh-prices'); fetchHoldings(); } catch {}
    setRefreshing(false);
  };
  useEffect(() => { fetchHoldings(); }, []);

  /* ── Calculations ── */
  const priced = holdings.filter(h => h.current_value && h.purchase_value && Math.abs(h.current_value - h.purchase_value) > 1);
  const totalVal = priced.reduce((s, h) => s + (h.current_value || 0), 0);
  const totalCost = priced.reduce((s, h) => s + (h.purchase_value || 0), 0);
  const totalPL = totalCost > 0 ? (totalVal - totalCost) / totalCost * 100 : null;
  const isPos = totalPL !== null && totalPL >= 0;
  const winning = priced.filter(h => h.current_value >= h.purchase_value).length;
  const best = priced.reduce((b, h) => {
    const p = (h.current_value - h.purchase_value) / h.purchase_value * 100;
    return (!b || p > b.pnl) ? { name: shortName(h.stock_name), pnl: p } : b;
  }, null);

  const withWeights = holdings.map(h => {
    const hasPrice = h.current_value && h.purchase_value && Math.abs(h.current_value - h.purchase_value) > 1;
    const pnl = hasPrice ? (h.current_value - h.purchase_value) / h.purchase_value * 100 : null;
    const weight = totalVal > 0 && h.current_value ? h.current_value / totalVal * 100 : 0;
    return { ...h, pnl, hasPrice, weight };
  }).sort((a, b) => sortBy === 'pnl'
    ? (a.pnl === null ? 1 : b.pnl === null ? -1 : b.pnl - a.pnl)
    : b.weight - a.weight
  );
  const donutData = [...withWeights].sort((a, b) => b.weight - a.weight).filter(h => h.weight > 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: T.border, borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div className="max-w-2xl mx-auto" style={{ padding: '24px 16px 120px' }}>

        {!holdings.length ? (
          /* ── Empty state ── */
          <div className="text-center" style={{ backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16, padding: 32, boxShadow: T.shadow }}>
            <div className="mx-auto mb-5 flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: T.surface }}>
              <FileSpreadsheet size={28} style={{ color: T.text3 }} />
            </div>
            <h2 className="m-0 mb-2" style={{ fontSize: 16, fontWeight: 600, color: T.text1 }}>Import your portfolio</h2>
            <p className="m-0 mb-6 mx-auto" style={{ fontSize: 14, color: T.text2, maxWidth: 280 }}>
              Upload your EasyEquities transaction history to get started.
            </p>
            <Link to="/transactions" className="inline-flex items-center gap-2 no-underline"
              style={{ fontSize: 14, fontWeight: 500, backgroundColor: T.purple, color: '#fff', borderRadius: 12, padding: '12px 24px', boxShadow: '0 4px 12px rgba(124,92,224,0.2)' }}>
              Import Transactions
            </Link>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-5"
              style={{ opacity: ready ? 1 : 0, transition: 'opacity 300ms ease' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 flex items-center justify-center"
                  style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: T.purpleLight, color: T.purple, fontSize: 15, fontWeight: 700 }}>
                  {user?.display_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="m-0 truncate" style={{ fontSize: 16, fontWeight: 600, color: T.text1 }}>{user?.display_name}</p>
                    {user?.portfolio_imported_at && (
                      <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6.5 11.1 2.7 7.3" stroke="#FFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                    )}
                  </div>
                  <p className="m-0" style={{ fontSize: 12, color: T.text3 }}>@{user?.handle}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowValues(v => !v)}
                  className="border-none cursor-pointer flex items-center justify-center min-h-[44px]"
                  style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: T.surface, color: T.text3 }}>
                  {showValues ? <Eye size={15} /> : <EyeOff size={15} />}
                </button>
                <button onClick={handleRefresh} disabled={refreshing}
                  className="border-none cursor-pointer flex items-center justify-center min-h-[44px]"
                  style={{ width: 32, height: 32, borderRadius: '50%', backgroundColor: T.surface, color: T.text3 }}>
                  <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* ── Hero card (navy gradient) ── */}
            <div style={{
              background: `linear-gradient(155deg, ${T.navyStart} 0%, ${T.navyMid} 45%, ${T.navyEnd} 100%)`,
              borderRadius: 20, padding: 24, marginBottom: 16,
              boxShadow: T.heroShadow,
              opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(16px)',
              transition: 'all 400ms ease 80ms',
            }}>
              {/* Top row: label + badge */}
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontSize: 12, fontWeight: 400, color: T.textDarkMuted, letterSpacing: 0.2 }}>Portfolio return</span>
                {user?.portfolio_imported_at && (
                  <span className="inline-flex items-center gap-1"
                    style={{ fontSize: 10, fontWeight: 600, color: T.greenDark, backgroundColor: 'rgba(16,185,129,0.12)', borderRadius: 8, padding: '3px 8px' }}>
                    EE verified
                  </span>
                )}
              </div>

              {/* Hero number */}
              <div className="flex items-baseline gap-2" style={{ marginBottom: 2 }}>
                <span style={{
                  fontSize: 44, fontWeight: 600, letterSpacing: -2,
                  color: showValues ? (totalPL === null ? T.textDarkMuted : '#FFFFFF') : T.textDarkMuted,
                }}>
                  {showValues
                    ? (totalPL !== null ? `${isPos ? '+' : '\u2212'}${Math.abs(totalPL).toFixed(1)}%` : '0.0%')
                    : '••••'
                  }
                </span>
              </div>
              <div className="flex items-center gap-2" style={{ marginBottom: 18 }}>
                {showValues && totalPL !== null && (
                  <span style={{ fontSize: 13, fontWeight: 500, color: T.greenDark }}>all time</span>
                )}
                <span style={{ fontSize: 13, fontWeight: 400, color: T.textDarkDim }}>
                  {showValues && totalPL !== null ? ' · ' : ''}{formatUpdated(user?.portfolio_imported_at)}
                </span>
              </div>

              {/* Glass panel: donut + stats */}
              <div style={{
                background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: 14, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 16,
              }}>
                <MiniDonut segments={donutData} count={holdings.length} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span style={{ fontSize: 12, color: T.textDarkMuted }}>Holdings: <strong style={{ color: T.textWhite, fontWeight: 600 }}>{holdings.length}</strong></span>
                    <span style={{ fontSize: 12, color: T.textDarkMuted }}>Win: <strong style={{ color: T.textWhite, fontWeight: 600 }}>{winning}/{priced.length}</strong></span>
                  </div>
                  {best && (
                    <span style={{ fontSize: 12, color: T.textDarkMuted }}>
                      Best: <strong style={{ color: best.pnl >= 0 ? T.greenDark : '#F87171', fontWeight: 600 }}>
                        {best.name.split(' ')[0]} {best.pnl >= 0 ? '+' : ''}{best.pnl.toFixed(1)}%
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Holdings section ── */}
            <div style={{
              opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 400ms ease 200ms',
            }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 12, padding: '0 4px' }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: T.text1 }}>Holdings</span>
                <div className="flex" style={{ backgroundColor: T.surface, borderRadius: 12, padding: 3 }}>
                  {['weight', 'pnl'].map(s => (
                    <button key={s} onClick={() => setSortBy(s)}
                      className="border-none cursor-pointer"
                      style={{
                        padding: '6px 16px', fontSize: 12, fontWeight: 500, borderRadius: 10,
                        backgroundColor: sortBy === s ? T.purple : 'transparent',
                        color: sortBy === s ? '#fff' : T.text3,
                        transition: 'all 150ms ease',
                        boxShadow: sortBy === s ? '0 4px 12px rgba(124,92,224,0.2)' : 'none',
                      }}>
                      {s === 'weight' ? 'Weight' : 'P&L'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Holdings list inside a card container */}
              <div style={{
                backgroundColor: T.card, border: `1px solid ${T.border}`, borderRadius: 16,
                boxShadow: T.shadow, padding: 8, display: 'flex', flexDirection: 'column', gap: 6,
              }}>
                {withWeights.map((h, i) => {
                  const pos = h.pnl !== null && h.pnl >= 0;
                  const tint = ICON_TINTS[i % ICON_TINTS.length];

                  return (
                    <Link key={h.id}
                      to={`/stock/${h.contract_code}?name=${encodeURIComponent(h.stock_name)}`}
                      className="block no-underline"
                      style={{
                        opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(10px)',
                        transition: `all 300ms ease ${250 + i * 40}ms`,
                      }}>
                      <div className="flex items-center gap-3"
                        style={{
                          backgroundColor: '#F8F7FC', borderRadius: 14, padding: '14px 16px',
                          transition: 'background-color 150ms ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = T.purpleLight}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = '#F8F7FC'}>

                        {/* Icon */}
                        <div className="shrink-0 flex items-center justify-center"
                          style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: tint.bg, color: tint.fg, fontSize: 11, fontWeight: 700 }}>
                          {abbrev(h.stock_name)}
                        </div>

                        {/* Name + subtitle */}
                        <div className="flex-1 min-w-0">
                          <p className="m-0 truncate" style={{ fontSize: 15, fontWeight: 600, color: T.text1 }}>
                            {shortName(h.stock_name)}
                          </p>
                          <p className="m-0 mt-0.5" style={{ fontSize: 12, fontWeight: 400, color: T.text3 }}>
                            {h.account_type}
                          </p>
                        </div>

                        {/* Weight + P&L */}
                        <div className="text-right shrink-0">
                          {h.hasPrice && showValues ? (
                            <>
                              <p className="m-0 tabular-nums" style={{ fontSize: 15, fontWeight: 700, color: T.text1 }}>
                                {h.weight.toFixed(1)}%
                              </p>
                              <p className="m-0 mt-0.5 tabular-nums" style={{ fontSize: 11, fontWeight: 600, color: pos ? T.green : T.red }}>
                                {h.price_source === 'scrape' ? '~' : ''}{pos ? '+' : '\u2212'}{Math.abs(h.pnl).toFixed(1)}%
                              </p>
                            </>
                          ) : h.hasPrice && !showValues ? (
                            <p className="m-0" style={{ fontSize: 14, color: T.text3 }}>••••</p>
                          ) : (
                            <span style={{ fontSize: 10, fontWeight: 500, color: T.text3, backgroundColor: T.surface, borderRadius: 8, padding: '3px 8px' }}>
                              No price
                            </span>
                          )}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>

            <p className="m-0 text-center" style={{ fontSize: 11, color: T.text3, marginTop: 16 }}>
              Percentages from imported transactions & market prices
            </p>
          </>
        )}
      </div>
    </div>
  );
}
