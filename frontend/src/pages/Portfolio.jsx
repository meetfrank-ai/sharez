import { useState, useEffect } from 'react';
import { FileSpreadsheet, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

/* ── Allocation colours ── */
const ALLOC = ['#7F77DD','#5DCAA5','#85B7EB','#D85A30','#EF9F27','#888780','#D4537E','#97C459'];

/* ── Display name shortening ── */
const SHORT = {
  'Prosus N.V': 'Prosus',
  'Naspers Limited': 'Naspers',
  'Capitec Bank Holdings Limited': 'Capitec',
  'Shoprite Holdings Limited': 'Shoprite',
  'Standard Bank Group Limited': 'Standard Bank',
  'Allan Gray Orbis Global Equity Feeder AMETF': 'Allan Gray AGOGE',
  'Coronation Global Emerging Markets Prescient Feeder AMETF': 'Coronation EM',
  'EasyETFs Global Equity Actively Managed ETF': 'EasyETFs Global',
  '36ONE BCI SA Equity Fund Class C': '36ONE SA Equity',
  'Merchant West SCI Value Fund': 'Merchant West',
  'Satrix Top 40 ETF': 'Satrix Top 40',
  'Satrix S&P 500 ETF': 'Satrix S&P 500',
  'CoreShares S&P 500 ETF': 'CoreShares S&P 500',
};
const shortName = n => SHORT[n] || n?.replace(/ (Limited|Holdings|PLC|Inc|Corporation|N\.V\.?|Group)\.?/gi, '').split(' ').slice(0, 3).join(' ');
const abbrev = n => { const s = shortName(n); return s?.length <= 3 ? s.toUpperCase() : s?.slice(0, 2).toUpperCase(); };

function formatUpdated(d) {
  if (!d) return 'Not synced';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 5) return 'Updated just now';
  if (m < 60) return `Updated ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Updated ${h}h ago`;
  return `Updated ${Math.floor(h / 24)}d ago`;
}

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

  const barData = [...withWeights].sort((a, b) => b.weight - a.weight).filter(h => h.weight > 0);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB', borderTopColor: 'transparent' }} />
    </div>
  );

  return (
    <div style={{ backgroundColor: '#F7F7FA', minHeight: '100vh' }}>
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 pb-28">

        {!holdings.length ? (
          /* ── Empty ── */
          <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: '#F3F4F6' }}>
              <FileSpreadsheet size={28} style={{ color: '#9CA3AF' }} />
            </div>
            <h2 className="m-0 mb-2" style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>Import your portfolio</h2>
            <p className="m-0 mb-6 max-w-xs mx-auto" style={{ fontSize: 13, color: '#9CA3AF' }}>
              Upload your EasyEquities transaction history to get started.
            </p>
            <Link to="/transactions" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl no-underline"
              style={{ fontSize: 13, fontWeight: 600, backgroundColor: '#4F46E5', color: '#fff' }}>
              Import Transactions
            </Link>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="flex items-center justify-between mb-5"
              style={{ opacity: ready ? 1 : 0, transition: 'opacity 300ms ease' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 rounded-full flex items-center justify-center"
                  style={{ width: 40, height: 40, background: 'linear-gradient(135deg, #7F77DD, #534AB7)', fontSize: 15, fontWeight: 500, color: '#fff' }}>
                  {user?.display_name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="min-w-0">
                  <p className="m-0 truncate" style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>{user?.display_name}</p>
                  <div className="flex items-center gap-1.5">
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>@{user?.handle}</span>
                    {user?.portfolio_imported_at && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full"
                        style={{ fontSize: 9, fontWeight: 500, backgroundColor: '#ECFDF5', color: '#10B981' }}>
                        <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6.5 11.1 2.7 7.3" stroke="#10B981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Verified
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={handleRefresh} disabled={refreshing}
                className="border-none cursor-pointer flex items-center justify-center shrink-0 min-h-[44px]"
                style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3F4F6', color: '#9CA3AF' }}>
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* ── Dark hero card — Portfolio return ── */}
            <div className="rounded-[20px] p-5 mb-5"
              style={{
                background: 'linear-gradient(135deg, #1A1A2E 0%, #2D1B69 100%)',
                opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(16px)',
                transition: 'all 400ms ease 80ms',
              }}>
              <div className="flex items-center justify-between mb-1">
                <span style={{ fontSize: 12, fontWeight: 400, color: 'rgba(255,255,255,0.5)', letterSpacing: 0.3 }}>Portfolio return</span>
                <button onClick={() => setShowValues(v => !v)}
                  className="border-none cursor-pointer flex items-center justify-center min-h-[44px]"
                  style={{ background: 'none', color: 'rgba(255,255,255,0.4)', padding: 4 }}>
                  {showValues ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span style={{
                  fontSize: 38, fontWeight: 600, letterSpacing: -1.5,
                  color: totalPL === null ? 'rgba(255,255,255,0.3)' : isPos ? '#5DCAA5' : '#F09595',
                  fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
                }}>
                  {showValues
                    ? (totalPL !== null ? `${isPos ? '+' : '\u2212'}${Math.abs(totalPL).toFixed(1)}%` : '0.0%')
                    : '••••'
                  }
                </span>
                {showValues && (
                  <span style={{ fontSize: 13, color: totalPL === null ? 'rgba(255,255,255,0.3)' : isPos ? '#5DCAA5' : '#F09595' }}>
                    all time
                  </span>
                )}
              </div>
              <p className="m-0" style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>
                {formatUpdated(user?.portfolio_imported_at)}
              </p>

              {/* Allocation bar */}
              {barData.length > 0 && (
                <div className="flex gap-0.5 rounded mt-4 overflow-hidden" style={{ height: 6 }}>
                  {barData.map((h, i) => (
                    <div key={h.id} style={{
                      width: `${h.weight}%`, backgroundColor: ALLOC[i % ALLOC.length],
                      borderRadius: i === 0 ? '3px 0 0 3px' : i === barData.length - 1 ? '0 3px 3px 0' : 0,
                      opacity: ready ? 1 : 0, transform: ready ? 'scaleX(1)' : 'scaleX(0)',
                      transformOrigin: 'left', transition: `all 500ms ease ${300 + i * 60}ms`,
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Stat pills ── */}
            <div className="flex gap-2.5 mb-5"
              style={{ opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(12px)', transition: 'all 400ms ease 150ms' }}>
              {[
                { label: 'Holdings', value: String(holdings.length), color: '#1A1A2E' },
                { label: 'Best', value: best ? `${best.name.split(' ')[0]} ${best.pnl >= 0 ? '+' : ''}${best.pnl.toFixed(0)}%` : '—', color: best?.pnl >= 0 ? '#10B981' : '#EF4444', small: true },
                { label: 'Win rate', value: `${winning}/${priced.length}`, color: priced.length > 0 ? (winning / priced.length >= 0.7 ? '#10B981' : winning / priced.length <= 0.3 ? '#EF4444' : '#1A1A2E') : '#9CA3AF' },
              ].map((p, i) => (
                <div key={i} className="flex-1 text-center py-3 px-2 rounded-2xl"
                  style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <p className="m-0 mb-1" style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 400 }}>{p.label}</p>
                  <p className="m-0 truncate" style={{ fontSize: p.small ? 13 : 20, fontWeight: 600, color: p.color }}>{p.value}</p>
                </div>
              ))}
            </div>

            {/* ── Holdings ── */}
            <div className="mb-5" style={{ opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(12px)', transition: 'all 400ms ease 200ms' }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>Holdings</span>
                <div className="flex rounded-lg overflow-hidden" style={{ backgroundColor: '#F3F4F6' }}>
                  {['weight', 'pnl'].map(s => (
                    <button key={s} onClick={() => setSortBy(s)}
                      className="border-none cursor-pointer"
                      style={{
                        padding: '6px 14px', fontSize: 11, fontWeight: 500,
                        backgroundColor: sortBy === s ? '#4F46E5' : 'transparent',
                        color: sortBy === s ? '#fff' : '#9CA3AF',
                        transition: 'all 150ms ease', borderRadius: sortBy === s ? 8 : 0,
                      }}>
                      {s === 'weight' ? 'Weight' : 'P&L'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col" style={{ gap: 6 }}>
                {withWeights.map((h, i) => {
                  const pos = h.pnl !== null && h.pnl >= 0;
                  const cIdx = barData.findIndex(b => b.id === h.id);
                  const col = cIdx >= 0 ? ALLOC[cIdx % ALLOC.length] : '#E5E7EB';

                  return (
                    <Link key={h.id}
                      to={`/stock/${h.contract_code}?name=${encodeURIComponent(h.stock_name)}`}
                      className="block no-underline"
                      style={{ opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(12px)', transition: `all 300ms ease ${250 + i * 40}ms` }}>
                      <div className="flex items-center gap-3 rounded-2xl px-4 py-3.5"
                        style={{ backgroundColor: '#FFFFFF', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', transition: 'box-shadow 150ms ease' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}>

                        {/* Icon */}
                        <div className="shrink-0 flex items-center justify-center rounded-xl"
                          style={{ width: 38, height: 38, backgroundColor: col + '18', color: col, fontSize: 11, fontWeight: 600 }}>
                          {abbrev(h.stock_name)}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="m-0 truncate" style={{ fontSize: 14, fontWeight: 500, color: '#1A1A2E' }}>
                            {shortName(h.stock_name)}
                          </p>
                          <p className="m-0 mt-0.5" style={{ fontSize: 11, color: '#C4C4C4' }}>
                            {h.account_type}
                          </p>
                        </div>

                        {/* Weight + P&L */}
                        <div className="text-right shrink-0">
                          {h.hasPrice && showValues ? (
                            <>
                              <p className="m-0 tabular-nums" style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>
                                {h.weight.toFixed(1)}%
                              </p>
                              <p className="m-0 mt-0.5 tabular-nums" style={{ fontSize: 11, fontWeight: 500, color: pos ? '#10B981' : '#EF4444' }}>
                                {pos ? '+' : '\u2212'}{Math.abs(h.pnl).toFixed(1)}%
                              </p>
                            </>
                          ) : h.hasPrice && !showValues ? (
                            <p className="m-0" style={{ fontSize: 14, color: '#C4C4C4' }}>••••</p>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 11, backgroundColor: '#F3F4F6', color: '#C4C4C4' }}>
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

            <p className="text-center m-0" style={{ fontSize: 10, color: '#C4C4C4' }}>
              Percentages from imported transactions & market prices
            </p>
          </>
        )}
      </div>
    </div>
  );
}
