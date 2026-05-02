import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../utils/api';

const AVATAR_COLORS = ['#7F77DD', '#D85A30', '#1D9E75', '#378ADD', '#D4537E', '#639922', '#BA7517', '#534AB7'];
const getColor = (id) =>
  AVATAR_COLORS[String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

const WINDOWS = [
  { key: '7d', label: '7 days' },
  { key: '30d', label: '30 days' },
  { key: 'all', label: 'All time' },
];

/**
 * Public leaderboard. % returns only — no rand amounts (D-7).
 * Users opt-out via the Tier Settings page (D-6 default = visible).
 */
export default function Rank() {
  const [window, setWindow] = useState('30d');
  const [data, setData] = useState({ users: [], as_of: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.get('/rank/', { params: { window } })
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => { if (!cancelled) setData({ users: [], as_of: null }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [window]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center gap-2 mb-1">
        <Trophy size={20} style={{ color: 'var(--accent)' }} />
        <h1 className="text-xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Rank</h1>
      </div>
      <p className="text-xs m-0 mb-4" style={{ color: 'var(--text-muted)' }}>
        Public leaderboard — % returns only. {data.as_of ? `As of ${new Date(data.as_of).toLocaleDateString('en-ZA')}.` : ''}
      </p>

      <div
        className="flex p-1 rounded-xl mb-4"
        style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)' }}
      >
        {WINDOWS.map((w) => {
          const active = window === w.key;
          return (
            <button
              key={w.key}
              onClick={() => setWindow(w.key)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: active ? 'var(--shadow)' : 'none',
              }}
            >
              {w.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB' }} />
        </div>
      ) : data.users.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm m-0 mb-2" style={{ color: 'var(--text-primary)' }}>No leaderboard data yet.</p>
          <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
            Ranks update daily once people connect their portfolios.
          </p>
        </div>
      ) : (
        <ul className="m-0 pl-0 list-none rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {data.users.map((u) => {
            const ret = u.return_pct;
            const positive = ret != null && ret >= 0;
            return (
              <li key={u.user_id}>
                <Link
                  to={`/user/${u.user_id}`}
                  className="flex items-center gap-3 px-4 py-3 no-underline"
                  style={{
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: u.is_you ? 'var(--accent-light)' : 'transparent',
                  }}
                >
                  <span
                    className="text-sm font-semibold w-6 text-right shrink-0"
                    style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}
                  >
                    {u.rank}
                  </span>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: getColor(u.user_id) }}
                  >
                    {(u.display_name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold m-0 truncate">
                      {u.display_name}{u.is_you && ' · you'}
                    </p>
                    <p className="text-[11px] m-0" style={{ color: 'var(--text-muted)' }}>
                      {u.holding_count} holdings{u.top_stock_name ? ` · top: ${u.top_stock_name}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0" style={{ color: positive ? '#16A34A' : '#DC2626' }}>
                    {positive ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    <span className="text-sm font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
                      {ret == null ? '—' : `${positive ? '+' : ''}${ret.toFixed(2)}%`}
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
