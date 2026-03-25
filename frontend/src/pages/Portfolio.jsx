import { useState, useEffect, useRef } from 'react';
import { FileSpreadsheet, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

/* ── STAK colour system ── */
const ALLOC_COLORS = ['#7F77DD','#5DCAA5','#85B7EB','#D85A30','#EF9F27','#888780','#D4537E','#97C459'];
const C = {
  base: '#0F0F14', card: '#18181f', pill: '#1f1f2a',
  positive: '#5DCAA5', negative: '#F09595', positiveBg: '#0F3D2E',
  textPrimary: '#FFFFFF', textMuted: '#7a7888', textDim: '#4a4958',
  brand: '#7F77DD', brandDark: '#534AB7', active: '#534AB7',
};

/* ── Display name shortening ── */
const DISPLAY_NAMES = {
  'Prosus N.V': 'Prosus N.V',
  'Naspers Limited': 'Naspers',
  'Capitec Bank Holdings Limited': 'Capitec',
  'Shoprite Holdings Limited': 'Shoprite',
  'Standard Bank Group Limited': 'Standard Bank',
  'Allan Gray Orbis Global Equity Feeder AMETF': 'Allan Gray AGOGE',
  'Coronation Global Emerging Markets Prescient Feeder AMETF': 'Coronation EM',
  'EasyETFs Global Equity Actively Managed ETF': 'EasyETFs Global Equity',
  '36ONE BCI SA Equity Fund Class C': '36ONE SA Equity',
  'Merchant West SCI Value Fund': 'Merchant West Value',
  'Satrix Top 40 ETF': 'Satrix Top 40',
  'Satrix S&P 500 ETF': 'Satrix S&P 500',
  'CoreShares S&P 500 ETF': 'CoreShares S&P 500',
};
function shortName(name) {
  if (DISPLAY_NAMES[name]) return DISPLAY_NAMES[name];
  return name?.replace(/ (Limited|Holdings|PLC|Inc|Corporation|N\.V\.?|Group)\.?/gi, '').split(' ').slice(0, 3).join(' ');
}
function abbrev(name) {
  const short = shortName(name);
  if (short.length <= 3) return short.toUpperCase();
  return short.slice(0, 2).toUpperCase();
}

/* ── Helpers ── */
function formatUpdated(dateStr) {
  if (!dateStr) return { text: 'Not synced', color: C.textDim };
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
  if (diff < 5) return { text: 'Updated just now', color: C.textDim };
  if (diff < 60) return { text: `Updated ${diff} min ago`, color: C.textDim };
  const h = Math.floor(diff / 60);
  if (h < 24) return { text: `Updated ${h}h ago`, color: C.textDim };
  const d = Math.floor(h / 24);
  if (d <= 6) return { text: `Updated ${d}d ago`, color: C.textMuted };
  return { text: `Updated ${d}d ago`, color: '#EF9F27' };
}

export default function Portfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sortBy, setSortBy] = useState('weight');
  const [ready, setReady] = useState(false);
  const heroRef = useRef(null);

  const fetchHoldings = () => {
    api.get('/portfolio/me')
      .then(res => setHoldings(res.data))
      .catch(() => {})
      .finally(() => { setLoading(false); setTimeout(() => setReady(true), 50); });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try { await api.post('/portfolio/refresh-prices'); fetchHoldings(); } catch {}
    setRefreshing(false);
  };

  useEffect(() => { fetchHoldings(); }, []);

  const hasPortfolio = holdings.length > 0;
  const importedAt = user?.portfolio_imported_at;

  /* ── Calculations (percentages only) ── */
  const pricedHoldings = holdings.filter(h =>
    h.current_value && h.purchase_value && Math.abs(h.current_value - h.purchase_value) > 1
  );
  const totalValue = pricedHoldings.reduce((s, h) => s + (h.current_value || 0), 0);
  const totalPurchase = pricedHoldings.reduce((s, h) => s + (h.purchase_value || 0), 0);
  const totalPL = totalPurchase > 0 ? ((totalValue - totalPurchase) / totalPurchase * 100) : null;
  const isPositive = totalPL !== null && totalPL >= 0;

  // Win rate
  const winning = pricedHoldings.filter(h => h.current_value >= h.purchase_value).length;
  const winTotal = pricedHoldings.length;

  // Best performer
  const best = pricedHoldings.reduce((b, h) => {
    const pnl = (h.current_value - h.purchase_value) / h.purchase_value * 100;
    return (!b || pnl > b.pnl) ? { name: shortName(h.stock_name), pnl } : b;
  }, null);

  // Holdings with weights, sorted
  const withWeights = holdings.map((h, oi) => {
    const hasPrice = h.current_value && h.purchase_value && Math.abs(h.current_value - h.purchase_value) > 1;
    const pnl = hasPrice ? (h.current_value - h.purchase_value) / h.purchase_value * 100 : null;
    const weight = totalValue > 0 && h.current_value ? (h.current_value / totalValue * 100) : 0;
    return { ...h, pnl, hasPrice, weight, origIdx: oi };
  }).sort((a, b) => {
    if (sortBy === 'pnl') {
      if (a.pnl === null && b.pnl === null) return 0;
      if (a.pnl === null) return 1;
      if (b.pnl === null) return -1;
      return b.pnl - a.pnl;
    }
    return b.weight - a.weight;
  });

  // Allocation bar data (always by weight desc)
  const barData = [...withWeights].sort((a, b) => b.weight - a.weight).filter(h => h.weight > 0);

  const updated = formatUpdated(importedAt);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64" style={{ backgroundColor: C.base }}>
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: C.textDim, borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: C.base, minHeight: '100vh' }}>
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6 pb-28">

        {!hasPortfolio ? (
          /* ── Empty state ── */
          <div className="rounded-[20px] p-8 text-center" style={{ backgroundColor: C.card }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ backgroundColor: C.pill }}>
              <FileSpreadsheet size={28} style={{ color: C.textDim }} />
            </div>
            <h2 className="m-0 mb-2" style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary }}>Import your portfolio</h2>
            <p className="m-0 mb-6 max-w-xs mx-auto" style={{ fontSize: 13, color: C.textMuted }}>
              Upload your EasyEquities transaction history to get started.
            </p>
            <Link to="/transactions"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl no-underline"
              style={{ fontSize: 13, fontWeight: 500, backgroundColor: C.active, color: '#fff' }}>
              Upload XLSX
            </Link>
          </div>
        ) : (
          <>
            {/* ── Header ── */}
            <div className="flex items-center gap-2.5 mb-5"
              style={{ opacity: ready ? 1 : 0, transition: 'opacity 300ms ease' }}>
              <div className="shrink-0 rounded-full flex items-center justify-center"
                style={{ width: 40, height: 40, background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`, fontSize: 15, fontWeight: 500, color: '#fff' }}>
                {user?.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="m-0 truncate" style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary }}>
                  {user?.display_name}
                </p>
                <div className="flex items-center gap-1.5">
                  <span style={{ fontSize: 11, color: C.textMuted }}>@{user?.handle}</span>
                  {importedAt && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[10px]"
                      style={{ fontSize: 9, fontWeight: 500, backgroundColor: C.positiveBg, color: C.positive }}>
                      <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                        <path d="M13.3 4.3L6.5 11.1 2.7 7.3" stroke={C.positive} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      EE verified
                    </span>
                  )}
                </div>
              </div>
              <button onClick={handleRefresh} disabled={refreshing}
                className="border-none cursor-pointer flex items-center justify-center shrink-0 min-h-[44px]"
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#1a1a24', color: C.textMuted }}>
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
              </button>
            </div>

            {/* ── Summary card ── */}
            <div className="rounded-[20px] p-5 mb-5"
              style={{ backgroundColor: C.card, opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(20px)', transition: 'all 400ms ease 100ms' }}>

              {/* Portfolio return */}
              <p className="m-0 mb-1" style={{ fontSize: 12, color: C.textMuted, letterSpacing: 0.3 }}>Portfolio return</p>
              <div className="flex items-baseline gap-2 mb-0.5">
                <span ref={heroRef} style={{
                  fontSize: 34, fontWeight: 500, letterSpacing: -1,
                  color: totalPL === null ? C.textMuted : isPositive ? C.positive : C.negative,
                }}>
                  {totalPL !== null ? `${isPositive ? '+' : '\u2212'}${Math.abs(totalPL).toFixed(1)}%` : '0.0%'}
                </span>
                <span style={{ fontSize: 13, color: totalPL === null ? C.textMuted : isPositive ? C.positive : C.negative }}>
                  all time
                </span>
              </div>
              <p className="m-0 mb-4" style={{ fontSize: 11, color: updated.color }}>{updated.text}</p>

              {/* Stat pills */}
              <div className="flex gap-2 mb-4">
                {[
                  { label: 'Holdings', value: String(holdings.length), color: C.textPrimary },
                  { label: 'Best', value: best ? `${best.name.split(' ')[0]} ${best.pnl >= 0 ? '+' : ''}${best.pnl.toFixed(0)}%` : '—', color: best && best.pnl >= 0 ? C.positive : best ? C.negative : C.textMuted, small: true },
                  { label: 'Win rate', value: `${winning}/${winTotal}`, color: winTotal > 0 ? (winning/winTotal >= 0.7 ? C.positive : winning/winTotal <= 0.3 ? C.negative : C.textPrimary) : C.textMuted },
                ].map((p, i) => (
                  <div key={i} className="flex-1 text-center py-2.5 px-2 rounded-xl" style={{ backgroundColor: C.pill }}>
                    <p className="m-0 mb-1" style={{ fontSize: 11, color: C.textMuted }}>{p.label}</p>
                    <p className="m-0 truncate" style={{ fontSize: p.small ? 14 : 20, fontWeight: 500, color: p.color }}>{p.value}</p>
                  </div>
                ))}
              </div>

              {/* Allocation bar */}
              {barData.length > 0 && (
                <div className="flex gap-0.5 rounded overflow-hidden" style={{ height: 8 }}>
                  {barData.map((h, i) => (
                    <div key={h.id} style={{
                      width: `${h.weight}%`,
                      backgroundColor: ALLOC_COLORS[i % ALLOC_COLORS.length],
                      borderRadius: i === 0 ? '4px 0 0 4px' : i === barData.length - 1 ? '0 4px 4px 0' : 0,
                      transition: 'transform 150ms ease',
                    }} />
                  ))}
                </div>
              )}
            </div>

            {/* ── Holdings list ── */}
            <div className="mb-5" style={{ opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(20px)', transition: 'all 400ms ease 200ms' }}>
              <div className="flex items-center justify-between mb-3 px-1">
                <span style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}>Holdings</span>
                <div className="flex gap-1">
                  {['weight', 'pnl'].map(s => (
                    <button key={s} onClick={() => setSortBy(s)}
                      className="border-none cursor-pointer"
                      style={{
                        padding: '5px 12px', borderRadius: 8, fontSize: 11, fontWeight: 500,
                        backgroundColor: sortBy === s ? C.active : C.pill,
                        color: sortBy === s ? '#fff' : C.textMuted,
                        transition: 'all 150ms ease',
                      }}>
                      {s === 'weight' ? 'Weight' : 'P&L'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex flex-col" style={{ gap: 5 }}>
                {withWeights.map((h, i) => {
                  const pos = h.pnl !== null && h.pnl >= 0;
                  const colorIdx = barData.findIndex(b => b.id === h.id);
                  const allocColor = colorIdx >= 0 ? ALLOC_COLORS[colorIdx % ALLOC_COLORS.length] : C.pill;

                  return (
                    <Link key={h.id}
                      to={`/stock/${h.contract_code}?name=${encodeURIComponent(h.stock_name)}`}
                      className="block no-underline"
                      style={{ opacity: ready ? 1 : 0, transform: ready ? 'translateY(0)' : 'translateY(20px)', transition: `all 300ms ease ${250 + i * 50}ms` }}
                    >
                      <div className="flex items-center gap-3 rounded-[14px] px-4 py-3.5"
                        style={{ backgroundColor: C.card, transition: 'background-color 150ms ease' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = '#1e1e28'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = C.card}
                      >
                        {/* Icon */}
                        <div className="shrink-0 flex items-center justify-center rounded-[10px]"
                          style={{ width: 38, height: 38, backgroundColor: allocColor, fontSize: 11, fontWeight: 600, color: '#fff' }}>
                          {abbrev(h.stock_name)}
                        </div>

                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <p className="m-0 truncate" style={{ fontSize: 14, fontWeight: 500, color: C.textPrimary }}>
                            {shortName(h.stock_name)}
                          </p>
                          <p className="m-0 mt-0.5" style={{ fontSize: 11, color: C.textDim }}>
                            {h.account_type}
                          </p>
                        </div>

                        {/* Weight + P&L */}
                        <div className="text-right shrink-0">
                          {h.hasPrice ? (
                            <>
                              <p className="m-0 tabular-nums" style={{ fontSize: 16, fontWeight: 500, color: C.textPrimary }}>
                                {h.weight.toFixed(1)}%
                              </p>
                              <p className="m-0 mt-0.5 tabular-nums" style={{ fontSize: 11, fontWeight: 500, color: pos ? C.positive : C.negative }}>
                                {pos ? '+' : '\u2212'}{Math.abs(h.pnl).toFixed(1)}%
                              </p>
                            </>
                          ) : (
                            <span className="px-2 py-0.5 rounded-md" style={{ fontSize: 11, backgroundColor: C.pill, color: C.textDim }}>
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

            <p className="text-center m-0" style={{ fontSize: 10, color: C.textDim }}>
              Percentages from imported transactions & market prices
            </p>
          </>
        )}
      </div>
    </div>
  );
}
