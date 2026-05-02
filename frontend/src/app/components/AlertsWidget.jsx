import { useEffect, useState } from 'react';
import { Bell, Trash2, Plus, X } from 'lucide-react';
import api from '../utils/api';

/**
 * Sidebar / stock-detail price-alerts widget. Lists active alerts and
 * exposes an "Add alert" mini-form. Alert evaluation runs as part of the
 * daily cron (scraper_job.evaluate_alerts).
 */
export default function AlertsWidget({ stock, currentPrice }) {
  const [alerts, setAlerts] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [direction, setDirection] = useState('above');
  const [threshold, setThreshold] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { load(); }, []);

  const load = () => {
    api.get('/alerts/').then(({ data }) => setAlerts(data || [])).catch(() => {});
  };

  const filtered = stock ? alerts.filter(a => a.stock_name === stock.stock_name) : alerts;

  const add = async () => {
    const t = parseFloat(threshold);
    if (!t || !stock) return;
    setBusy(true);
    try {
      await api.post('/alerts/', {
        stock_name: stock.stock_name,
        contract_code: stock.contract_code,
        eodhd_symbol: stock.eodhd_symbol,
        direction,
        threshold_price: t,
        currency: stock.currency || 'ZAR',
      });
      setShowForm(false);
      setThreshold('');
      load();
    } catch (e) {
      alert(e.response?.data?.detail || 'Could not create alert');
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id) => {
    try {
      await api.delete(`/alerts/${id}`);
      load();
    } catch {}
  };

  return (
    <div
      className="rounded-xl"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', padding: '14px 16px' }}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Bell size={14} style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Price alerts</h3>
        </div>
        {stock && !showForm && (
          <button
            onClick={() => setShowForm(true)}
            aria-label="Add alert"
            className="bg-transparent border-none cursor-pointer p-1 rounded"
            style={{ color: 'var(--accent)' }}
          >
            <Plus size={14} />
          </button>
        )}
      </div>

      {showForm && stock && (
        <div className="rounded-md p-3 mb-3" style={{ backgroundColor: 'var(--bg-page)' }}>
          <div className="flex items-center gap-2 mb-2">
            <select
              value={direction}
              onChange={(e) => setDirection(e.target.value)}
              className="text-xs px-2 py-1 rounded outline-none"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            >
              <option value="above">crosses above</option>
              <option value="below">crosses below</option>
            </select>
            <input
              type="number"
              step="0.01"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              placeholder={currentPrice != null ? Number(currentPrice).toFixed(2) : 'price'}
              className="flex-1 text-xs px-2 py-1 rounded outline-none"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
          </div>
          <div className="flex items-center gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="text-xs bg-transparent border-none cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              Cancel
            </button>
            <button
              onClick={add}
              disabled={busy || !threshold}
              className="text-xs font-semibold px-3 py-1 rounded-md disabled:opacity-50 border-none cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            >
              {busy ? '…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
          {stock ? 'No alerts on this stock yet.' : 'No active alerts. Add one from any stock detail page.'}
        </p>
      ) : (
        <ul className="m-0 pl-0 list-none space-y-1.5">
          {filtered.map((a) => (
            <li key={a.id} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-primary)' }}>
                {a.stock_name} {a.direction} {a.currency === 'USD' ? '$' : 'R'}{a.threshold_price}
              </span>
              <button
                onClick={() => remove(a.id)}
                aria-label="Delete"
                className="bg-transparent border-none cursor-pointer p-1"
                style={{ color: 'var(--text-muted)' }}
              >
                <Trash2 size={12} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
