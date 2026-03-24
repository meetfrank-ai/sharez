import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Award, DollarSign, FileSpreadsheet, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import HoldingCard from '../components/HoldingCard';
// Import moved to Transactions page

const CHART_COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#D97706', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Portfolio() {
  const { user } = useAuth();
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  // Import moved to Transactions page

  const fetchHoldings = () => {
    api.get('/portfolio/me')
      .then((res) => setHoldings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHoldings(); }, []);

  const hasPortfolio = holdings.length > 0;
  const importedAt = user?.portfolio_imported_at;

  const totalValue = holdings.reduce((s, h) => s + (h.current_value || 0), 0);
  const totalPurchase = holdings.reduce((s, h) => s + (h.purchase_value || 0), 0);
  const totalGain = totalValue - totalPurchase;
  const totalPL = totalPurchase > 0 ? ((totalGain / totalPurchase) * 100).toFixed(2) : null;
  const isPositive = totalGain >= 0;

  const topPerformer = holdings.reduce((best, h) => {
    if (!h.current_value || !h.purchase_value) return best;
    const pct = ((h.current_value - h.purchase_value) / h.purchase_value) * 100;
    if (!best || pct > best.pct) return { name: h.stock_name, pct };
    return best;
  }, null);

  const pieData = holdings.filter(h => h.current_value).map(h => ({
    name: h.stock_name,
    value: h.current_value,
  }));

  const formatImportDate = (dateStr) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Updated today';
    if (diffDays === 1) return 'Updated yesterday';
    if (diffDays < 7) return `Updated ${diffDays} days ago`;
    return `Updated ${d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>My Portfolio</h1>
          {importedAt && (
            <div className="flex items-center gap-1.5 mt-1">
              <Shield size={12} style={{ color: 'var(--success)' }} />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {formatImportDate(importedAt)} · Verified from EasyEquities
              </span>
            </div>
          )}
        </div>
        {hasPortfolio && (
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 border-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)', border: '1px solid var(--border)' }}
          >
            <Upload size={14} />
            Update
          </button>
        )}
      </div>

      {/* Empty state — link to Transactions page */}
      {!hasPortfolio ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'var(--accent-light)' }}>
            <FileSpreadsheet size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-semibold m-0 mb-2" style={{ color: 'var(--text-primary)' }}>
            No holdings yet
          </h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Import your EasyEquities transaction history to build your portfolio automatically.
          </p>

          <Link to="/transactions"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold no-underline transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            Go to Transactions →
          </Link>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total Value', value: `R${totalValue.toLocaleString()}`, Icon: DollarSign, color: 'var(--accent)' },
              { label: 'Total Gain/Loss', value: `${isPositive ? '+' : ''}R${Math.abs(totalGain).toLocaleString()}`, Icon: isPositive ? TrendingUp : TrendingDown, color: isPositive ? 'var(--success)' : 'var(--danger)' },
              { label: 'Return', value: totalPL ? `${parseFloat(totalPL) >= 0 ? '+' : ''}${totalPL}%` : '—', Icon: isPositive ? TrendingUp : TrendingDown, color: isPositive ? 'var(--success)' : 'var(--danger)' },
              { label: 'Top Performer', value: topPerformer ? topPerformer.name : '—', Icon: Award, color: 'var(--tier-vault)' },
            ].map((card, i) => (
              <div key={i} className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <card.Icon size={14} style={{ color: card.color }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>{card.label}</span>
                </div>
                <p className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{card.value}</p>
              </div>
            ))}
          </div>

          {/* Holdings + Chart */}
          <div className="grid md:grid-cols-3 gap-5">
            <div className="md:col-span-2">
              <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Holdings</h2>
              {holdings.map((h) => <HoldingCard key={h.id} holding={h} />)}
            </div>

            {pieData.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>Allocation</h2>
                <div className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(val) => `R${val.toLocaleString()}`}
                        contentStyle={{ backgroundColor: '#FFFFFF', border: '1px solid #E8ECF1', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-1.5 mt-2">
                    {pieData.map((d, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                          <span style={{ color: 'var(--text-secondary)' }}>{d.name}</span>
                        </div>
                        <span style={{ color: 'var(--text-primary)' }}>
                          {totalValue > 0 ? `${((d.value / totalValue) * 100).toFixed(1)}%` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Import moved to Transactions page */}
    </div>
  );
}
