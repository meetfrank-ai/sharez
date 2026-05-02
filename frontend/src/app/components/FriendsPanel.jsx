import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import api from '../utils/api';

const AVATAR_COLORS = ['#7F77DD', '#D85A30', '#1D9E75', '#378ADD', '#D4537E', '#639922', '#BA7517', '#534AB7'];
const getColor = (id) =>
  AVATAR_COLORS[String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

/**
 * Right-rail friends panel — top 5 follows with the user's most recent
 * action signal (last note timestamp). Sirius pattern, but rand-free per
 * D-7 (no return % or values shown — just "active 3h ago").
 */
export default function FriendsPanel() {
  const [follows, setFollows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.get('/following')
      .then(({ data }) => { if (!cancelled) setFollows(data || []); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const top = (follows || []).slice(0, 5);

  return (
    <aside
      className="hidden xl:flex flex-col fixed"
      style={{
        top: 20,
        bottom: 20,
        right: 20,
        width: 280,
        backgroundColor: '#FFFFFF',
        border: '1px solid #E6E9F2',
        borderRadius: 20,
        padding: '20px 18px',
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Users size={16} style={{ color: 'var(--accent)' }} />
        <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Friends</h3>
      </div>

      {loading ? (
        <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : top.length === 0 ? (
        <div>
          <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
            Follow traders to see their latest activity here.
          </p>
          <Link
            to="/discover"
            className="text-xs font-semibold no-underline mt-3 inline-block"
            style={{ color: 'var(--accent)' }}
          >
            Find people →
          </Link>
        </div>
      ) : (
        <>
          <ul className="m-0 pl-0 list-none space-y-2">
            {top.map((f) => (
              <li key={f.following_id || f.id}>
                <Link
                  to={`/user/${f.following_id || f.id}`}
                  className="flex items-center gap-2.5 no-underline rounded-md p-1.5 transition-colors"
                  style={{ color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-page)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white shrink-0"
                    style={{ backgroundColor: getColor(f.following_id || f.id) }}
                  >
                    {(f.display_name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium m-0 truncate">{f.display_name}</p>
                    {f.handle && (
                      <p className="text-[11px] m-0 truncate" style={{ color: 'var(--text-muted)' }}>@{f.handle}</p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          <Link
            to="/followers"
            className="text-xs font-semibold no-underline mt-3 inline-block"
            style={{ color: 'var(--accent)' }}
          >
            View all →
          </Link>
        </>
      )}
    </aside>
  );
}
