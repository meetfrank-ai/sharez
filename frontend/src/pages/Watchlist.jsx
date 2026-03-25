import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, X } from 'lucide-react';
import api from '../utils/api';

export default function Watchlist() {
  const [stocks, setStocks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/portfolio/followed-stocks')
      .then(res => setStocks(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const unfollow = async (code) => {
    try {
      await api.delete(`/portfolio/follow-stock/${code}`);
      setStocks(s => s.filter(st => st.contract_code !== code));
    } catch {}
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
    </div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold mb-5 m-0" style={{ color: 'var(--text-primary)' }}>Watchlist</h1>

      {stocks.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Bookmark size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm m-0 mb-1" style={{ color: 'var(--text-secondary)' }}>No stocks in your watchlist</p>
          <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
            Tap "Follow stock" on any stock page to add it here
          </p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          {stocks.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 transition-colors"
              style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
              <Link to={`/stock/${s.contract_code}?name=${encodeURIComponent(s.stock_name)}`}
                className="flex items-center gap-3 flex-1 no-underline min-w-0">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-[11px] font-semibold shrink-0"
                  style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                  {s.stock_name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium m-0 truncate" style={{ color: 'var(--text-primary)' }}>{s.stock_name}</p>
                  <p className="text-[11px] m-0" style={{ color: 'var(--text-muted)' }}>{s.contract_code}</p>
                </div>
              </Link>
              <button onClick={() => unfollow(s.contract_code)}
                className="w-11 h-11 rounded-lg flex items-center justify-center bg-transparent border-none cursor-pointer hover:opacity-70"
                style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
