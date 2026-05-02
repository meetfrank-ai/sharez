import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, Heart, MessageCircle, TrendingUp, TrendingDown, UserPlus, Mail } from 'lucide-react';
import api from '../utils/api';

/**
 * Bell + dropdown. Polls /api/notifications/unread-count every 30s while
 * the tab is focused; opens to fetch the latest 30 entries on click.
 *
 * Notification "kinds" → icon + copy:
 *   follow / follow_request   UserPlus
 *   note_like                 Heart
 *   note_reply                MessageCircle
 *   trade_react (bull|bear)   TrendingUp / TrendingDown
 *   gmail_synced              Mail
 */
export default function NotificationsBell() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    const refresh = () => {
      if (document.hidden) return;
      api.get('/notifications/unread-count')
        .then(({ data }) => { if (!cancelled) setUnread(data.unread || 0); })
        .catch(() => {});
    };
    refresh();
    const t = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      cancelled = true;
      clearInterval(t);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  // Click-outside-to-close
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open]);

  const handleOpen = async () => {
    setOpen(true);
    setLoading(true);
    try {
      const { data } = await api.get('/notifications/');
      setItems(data || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  const markAllRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setItems((prev) => prev.map((i) => ({ ...i, read: true })));
      setUnread(0);
    } catch {}
  };

  const handleClick = async (n) => {
    setOpen(false);
    if (!n.read) {
      try { await api.post(`/notifications/${n.id}/read`); } catch {}
      setUnread((u) => Math.max(0, u - 1));
    }
    const dest = destinationFor(n);
    if (dest) navigate(dest);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        aria-label="Notifications"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className="relative p-2 rounded-lg bg-transparent border-none cursor-pointer"
        style={{ color: 'var(--text-muted)' }}
      >
        <Bell size={20} />
        {unread > 0 && (
          <span
            className="absolute top-1 right-1 flex items-center justify-center text-[10px] font-bold text-white rounded-full"
            style={{ backgroundColor: 'var(--danger)', minWidth: 16, height: 16, padding: '0 4px' }}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 rounded-xl overflow-hidden z-50"
          style={{
            width: 360,
            maxWidth: 'calc(100vw - 24px)',
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow)',
          }}
        >
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
            <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Notifications</h3>
            {items.some((i) => !i.read) && (
              <button
                onClick={markAllRead}
                className="text-xs bg-transparent border-none cursor-pointer flex items-center gap-1"
                style={{ color: 'var(--accent)' }}
              >
                <Check size={12} /> Mark all read
              </button>
            )}
          </div>

          <div style={{ maxHeight: 420, overflowY: 'auto' }}>
            {loading ? (
              <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</div>
            ) : items.length === 0 ? (
              <div className="p-6 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                You're all caught up.
              </div>
            ) : (
              <ul className="m-0 pl-0 list-none">
                {items.map((n) => (
                  <li key={n.id}>
                    <button
                      onClick={() => handleClick(n)}
                      className="w-full text-left bg-transparent border-none cursor-pointer flex items-start gap-3 px-4 py-3 transition-colors"
                      style={{
                        backgroundColor: n.read ? 'transparent' : 'var(--accent-light)',
                        borderBottom: '1px solid var(--border)',
                      }}
                    >
                      <NotifIcon kind={n.kind} sentiment={n.metadata?.sentiment} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm m-0" style={{ color: 'var(--text-primary)' }}>
                          {renderText(n)}
                        </p>
                        <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {relTime(n.created_at)}
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function NotifIcon({ kind, sentiment }) {
  const map = {
    follow: { I: UserPlus, color: 'var(--accent)' },
    follow_request: { I: UserPlus, color: 'var(--accent)' },
    note_like: { I: Heart, color: '#DC2626' },
    note_reply: { I: MessageCircle, color: 'var(--accent)' },
    trade_react: sentiment === 'bear'
      ? { I: TrendingDown, color: '#DC2626' }
      : { I: TrendingUp, color: '#16A34A' },
    gmail_synced: { I: Mail, color: 'var(--accent)' },
  };
  const def = map[kind] || { I: Bell, color: 'var(--text-muted)' };
  const Icon = def.I;
  return (
    <span
      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
      style={{ backgroundColor: 'var(--bg-page)', color: def.color }}
    >
      <Icon size={14} />
    </span>
  );
}

function renderText(n) {
  const actor = n.actor?.display_name || 'Someone';
  switch (n.kind) {
    case 'follow':
      return `${actor} followed you`;
    case 'follow_request':
      return `${actor} requested to follow you`;
    case 'note_like':
      return `${actor} liked your note`;
    case 'note_reply':
      return `${actor} replied to your note`;
    case 'trade_react':
      return `${actor} marked your trade ${n.metadata?.sentiment || 'a reaction'}`;
    case 'gmail_synced':
      return `${n.metadata?.new_trades || 0} new trades synced from Gmail`;
    default:
      return n.kind;
  }
}

function destinationFor(n) {
  if (n.target_kind === 'note') return `/note/${n.target_id}`;
  if (n.target_kind === 'thesis') return `/stock/${n.metadata?.contract_code || ''}`;
  if (n.target_kind === 'user' && n.actor?.id) return `/user/${n.actor.id}`;
  if (n.target_kind === 'feed_event' || n.target_kind === 'trade') return `/app`;
  return null;
}

function relTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const diff = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}
