import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trophy, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import api from '../utils/api';

const COLORS = ['#7F77DD', '#D85A30', '#1D9E75', '#378ADD', '#D4537E', '#639922', '#BA7517', '#534AB7'];
const getColor = (id) => COLORS[String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

export default function ChallengeLeaderboard() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    api.get(`/challenges/${slug}/leaderboard`)
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(err => { if (!cancelled) setError(err.response?.data?.detail || 'Could not load leaderboard'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB' }} /></div>;
  if (error) return <div className="max-w-2xl mx-auto px-4 py-6 text-sm" style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!data) return null;

  const c = data.challenge;
  const ps = data.participants || [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to={`/challenges/${slug}`} className="flex items-center gap-1 text-sm mb-4 no-underline" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={16} /> {c.name}
      </Link>

      <div className="flex items-center gap-2 mb-1">
        <Trophy size={20} style={{ color: 'var(--accent)' }} />
        <h1 className="text-xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Leaderboard</h1>
      </div>
      <p className="text-xs m-0 mb-4" style={{ color: 'var(--text-muted)' }}>
        Ranked by equal-weighted % return across {c.pick_count} picks. {ps.length} of {c.participant_count} participants are locked in.
      </p>

      {ps.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm m-0 mb-1" style={{ color: 'var(--text-primary)' }}>
            {c.is_locked ? 'Locking returns…' : 'Picks open until lockup.'}
          </p>
          <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
            {c.is_locked ? 'Returns refresh once daily.' : 'Leaderboard goes live the moment lockup passes.'}
          </p>
        </div>
      ) : (
        <ul className="m-0 pl-0 list-none rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          {ps.map((p) => {
            const ret = p.return_pct;
            const positive = ret != null && ret >= 0;
            return (
              <li key={p.user_id}>
                <Link
                  to={`/challenges/${slug}/participants/${p.user_id}`}
                  className="flex items-center gap-3 px-4 py-3 no-underline"
                  style={{
                    color: 'var(--text-primary)',
                    borderBottom: '1px solid var(--border)',
                    backgroundColor: p.is_you ? 'var(--accent-light)' : 'transparent',
                  }}
                >
                  <span className="text-sm font-semibold w-6 text-right shrink-0" style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                    {p.rank}
                  </span>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: getColor(p.user_id) }}>
                    {(p.display_name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold m-0 truncate">
                      {p.display_name}{p.is_you && ' · you'}
                    </p>
                    {p.handle && <p className="text-[11px] m-0" style={{ color: 'var(--text-muted)' }}>@{p.handle}</p>}
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
