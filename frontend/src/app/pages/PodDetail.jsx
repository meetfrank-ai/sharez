import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layers, ChevronLeft, Lock, Users, LogOut } from 'lucide-react';
import api from '../utils/api';

export default function PodDetail() {
  const { slug } = useParams();
  const [pod, setPod] = useState(null);
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const podRes = await api.get(`/pods/${slug}`);
      setPod(podRes.data);
      if (podRes.data.is_member) {
        const feedRes = await api.get(`/pods/${slug}/feed`);
        setFeed(feedRes.data || []);
      } else {
        setFeed([]);
      }
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not load pod');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [slug]);

  const join = async () => {
    try {
      await api.post(`/pods/${slug}/join`);
      load();
    } catch (e) {
      setError(e.response?.data?.detail || 'Could not join pod');
    }
  };

  const leave = async () => {
    if (!confirm('Leave this pod?')) return;
    try {
      await api.post(`/pods/${slug}/leave`);
      load();
    } catch {}
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB' }} /></div>;
  }
  if (!pod) {
    return <div className="max-w-2xl mx-auto px-4 py-6 text-sm" style={{ color: 'var(--danger)' }}>{error || 'Not found'}</div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to="/pods" className="flex items-center gap-1 text-sm mb-4 no-underline" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={16} /> All pods
      </Link>

      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Layers size={18} style={{ color: 'var(--accent)' }} />
              <h1 className="text-lg font-semibold m-0">{pod.name}</h1>
              {pod.is_private && <Lock size={14} style={{ color: 'var(--text-muted)' }} />}
            </div>
            {pod.description && (
              <p className="text-sm m-0 mb-2" style={{ color: 'var(--text-secondary)' }}>{pod.description}</p>
            )}
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Users size={11} />
              {pod.member_count} of {pod.member_limit} members
            </div>
          </div>
          {pod.is_member ? (
            <button
              onClick={leave}
              className="flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-semibold border cursor-pointer"
              style={{ backgroundColor: 'transparent', borderColor: 'var(--border)', color: 'var(--danger)' }}
            >
              <LogOut size={12} /> Leave
            </button>
          ) : (
            <button
              onClick={join}
              disabled={pod.is_private || pod.member_count >= pod.member_limit}
              className="px-3 py-1.5 rounded-md text-xs font-semibold disabled:opacity-50 border-none cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            >
              {pod.is_private ? 'Invite-only' : 'Join'}
            </button>
          )}
        </div>
      </div>

      {!pod.is_member ? (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>Join this pod to see its feed.</p>
        </div>
      ) : feed.length === 0 ? (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>No activity yet — be the first to post a note or share a trade.</p>
        </div>
      ) : (
        <ul className="m-0 pl-0 list-none space-y-3">
          {feed.map((it) => (
            <li key={`${it.item_type}-${it.id}`} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>{it.display_name}</span>
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>· {new Date(it.created_at).toLocaleString('en-ZA', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              {it.item_type === 'transaction' ? (
                <p className="text-sm m-0">
                  <strong>{it.event_type === 'added_stock' ? 'Bought' : 'Sold'}</strong> {it.stock_name}
                </p>
              ) : (
                <p className="text-sm m-0 whitespace-pre-line">{it.body}</p>
              )}
              {it.stock_name && it.item_type !== 'transaction' && (
                <p className="text-xs m-0 mt-1" style={{ color: 'var(--text-muted)' }}>· {it.stock_name}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
