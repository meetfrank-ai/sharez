import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, FileSpreadsheet, Shield, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

const CHART_COLORS = ['#4F46E5', '#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#8B5CF6'];

export default function Portfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchHoldings = () => {
    api.get('/portfolio/me')
      .then((res) => setHoldings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await api.post('/portfolio/refresh-prices');
      fetchHoldings();
    } catch {}
    setRefreshing(false);
  };

  useEffect(() => { fetchHoldings(); }, []);

  const hasPortfolio = holdings.length > 0;
  const importedAt = user?.portfolio_imported_at;

  const pricedHoldings = holdings.filter(h =>
    h.current_value && h.purchase_value && Math.abs(h.current_value - h.purchase_value) > 1
  );

  const totalValue = pricedHoldings.reduce((s, h) => s + (h.current_value || 0), 0);
  const totalPurchase = pricedHoldings.reduce((s, h) => s + (h.purchase_value || 0), 0);
  const totalGain = totalValue - totalPurchase;
  const totalPL = totalPurchase > 0 ? ((totalGain / totalPurchase) * 100) : null;
  const isPositive = totalGain >= 0;

  const pieData = holdings
    .filter(h => h.current_value && h.current_value > 0)
    .sort((a, b) => b.current_value - a.current_value)
    .map(h => ({ name: h.stock_name, value: h.current_value }));

  const formatDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now - d) / 86400000);
    if (diff === 0) return 'today';
    if (diff === 1) return 'yesterday';
    if (diff < 7) return `${diff}d ago`;
    return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
  };

  // Sort holdings: priced first (by value desc), then unpriced
  const sortedHoldings = [...holdings].sort((a, b) => {
    const aHasPrice = a.current_value && a.purchase_value && Math.abs(a.current_value - a.purchase_value) > 1;
    const bHasPrice = b.current_value && b.purchase_value && Math.abs(b.current_value - b.purchase_value) > 1;
    if (aHasPrice && !bHasPrice) return -1;
    if (!aHasPrice && bHasPrice) return 1;
    return (b.current_value || 0) - (a.current_value || 0);
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      {!hasPortfolio ? (
        /* Empty state */
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'var(--accent-light)' }}>
            <FileSpreadsheet size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-semibold m-0 mb-2" style={{ color: 'var(--text-primary)' }}>No holdings yet</h2>
          <p className="text-sm mb-6 max-w-xs mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Import your EasyEquities transaction history to build your portfolio.
          </p>
          <Link to="/transactions"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold no-underline"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            Import Transactions
          </Link>
        </div>
      ) : (
        <>
          {/* Hero — Total Value */}
          <div className="rounded-2xl p-6 mb-4" style={{ backgroundColor: '#1A1A2E' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Total Portfolio Value</span>
              <button onClick={handleRefresh} disabled={refreshing}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium border-none cursor-pointer min-h-[44px]"
                style={{ backgroundColor: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}>
                <RefreshCw size={10} className={refreshing ? 'animate-spin' : ''} />
                {refreshing ? 'Updating...' : importedAt ? formatDate(importedAt) : 'Refresh'}
              </button>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold m-0 mb-3 tracking-tight" style={{ color: '#FFFFFF' }}>
              R{totalValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </h1>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                style={{ backgroundColor: isPositive ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }}>
                {isPositive
                  ? <TrendingUp size={14} style={{ color: '#10B981' }} />
                  : <TrendingDown size={14} style={{ color: '#EF4444' }} />
                }
                <span className="text-sm font-bold" style={{ color: isPositive ? '#10B981' : '#EF4444' }}>
                  {totalPL !== null ? `${isPositive ? '+' : ''}${totalPL.toFixed(1)}%` : '—'}
                </span>
              </div>
              <span className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {isPositive ? '+' : ''}R{Math.abs(totalGain).toLocaleString(undefined, { maximumFractionDigits: 0 })} all time
              </span>
            </div>

            {importedAt && (
              <div className="flex items-center gap-1.5 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <Shield size={11} style={{ color: '#10B981' }} />
                <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Verified from EasyEquities
                </span>
              </div>
            )}
          </div>

          {/* Allocation chart */}
          {pieData.length > 0 && (
            <div className="rounded-2xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <h2 className="text-xs font-semibold uppercase tracking-wider m-0 mb-4" style={{ color: 'var(--text-muted)' }}>Allocation</h2>
              <div className="flex items-center gap-4">
                <div className="shrink-0" style={{ width: 120, height: 120 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={35} outerRadius={55} paddingAngle={2} dataKey="value" stroke="none">
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex-1 min-w-0 space-y-2">
                  {pieData.slice(0, 5).map((d, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="text-xs truncate" style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                      </div>
                      <span className="text-xs font-semibold shrink-0 ml-2" style={{ color: 'var(--text-primary)' }}>
                        {totalValue > 0 ? `${((d.value / totalValue) * 100).toFixed(0)}%` : '—'}
                      </span>
                    </div>
                  ))}
                  {pieData.length > 5 && (
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>+{pieData.length - 5} more</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Holdings list */}
          <div className="mb-4">
            <h2 className="text-xs font-semibold uppercase tracking-wider m-0 mb-3" style={{ color: 'var(--text-muted)' }}>
              Holdings ({holdings.length})
            </h2>
            <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              {sortedHoldings.map((h, i) => {
                const hasPrice = h.current_value && h.purchase_value && Math.abs(h.current_value - h.purchase_value) > 1;
                const pnl = hasPrice ? ((h.current_value - h.purchase_value) / h.purchase_value * 100) : null;
                const pos = pnl !== null && pnl >= 0;
                const alloc = totalValue > 0 && h.current_value ? ((h.current_value / totalValue) * 100) : null;

                return (
                  <Link key={h.id}
                    to={`/stock/${h.contract_code}?name=${encodeURIComponent(h.stock_name)}`}
                    className="block no-underline"
                  >
                    <div className="flex items-center gap-3 px-4 py-3.5"
                      style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      {/* Icon */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                        style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] + '18', color: CHART_COLORS[i % CHART_COLORS.length] }}>
                        {h.stock_name?.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--text-primary)' }}>
                          {h.stock_name}
                        </p>
                        <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {h.account_type}{alloc ? ` · ${alloc.toFixed(0)}%` : ''}
                        </p>
                      </div>

                      {/* Value + P&L */}
                      <div className="text-right shrink-0">
                        {hasPrice ? (
                          <>
                            <p className="text-sm font-bold m-0 tabular-nums" style={{ color: 'var(--text-primary)' }}>
                              R{h.current_value.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                            <p className="text-[11px] font-semibold m-0 mt-0.5" style={{ color: pos ? '#10B981' : '#EF4444' }}>
                              {pos ? '+' : ''}{pnl.toFixed(1)}%
                            </p>
                          </>
                        ) : (
                          <span className="text-[11px] px-2 py-0.5 rounded-md" style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)' }}>
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

          <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
            Values from imported transactions & latest market prices
          </p>
        </>
      )}
    </div>
  );
}
