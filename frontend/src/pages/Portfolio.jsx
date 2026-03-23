import { useState, useEffect } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, Award, DollarSign } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import api from '../utils/api';
import HoldingCard from '../components/HoldingCard';
import InvestmentReasonModal from '../components/InvestmentReasonModal';

const CHART_COLORS = ['#4F46E5', '#3B82F6', '#10B981', '#D97706', '#EF4444', '#8B5CF6', '#EC4899'];

export default function Portfolio() {
  const [holdings, setHoldings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [newStocks, setNewStocks] = useState([]);

  const fetchHoldings = () => {
    api.get('/portfolio/me')
      .then((res) => setHoldings(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchHoldings(); }, []);

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await api.post('/portfolio/sync');
      fetchHoldings();
      if (res.data.added_stocks?.length > 0) {
        setNewStocks(res.data.added_stocks);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>My Portfolio</h1>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
        >
          <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
          {syncing ? 'Syncing...' : 'Sync'}
        </button>
      </div>

      {holdings.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>No holdings yet</p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Connect EasyEquities in Settings to sync your portfolio</p>
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
              <div
                key={i}
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
              >
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
                <div
                  className="rounded-xl p-4"
                  style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
                >
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                        {pieData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val) => `R${val.toLocaleString()}`}
                        contentStyle={{
                          backgroundColor: '#FFFFFF',
                          border: '1px solid #E8ECF1',
                          borderRadius: '8px',
                          fontSize: '12px',
                        }}
                      />
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

      {/* Investment reason prompt for newly synced stocks */}
      {newStocks.length > 0 && (
        <InvestmentReasonModal
          stocks={newStocks}
          onClose={() => setNewStocks([])}
        />
      )}
    </div>
  );
}
