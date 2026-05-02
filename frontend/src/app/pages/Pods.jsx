import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layers, Plus, Lock, Users, X } from 'lucide-react';
import api from '../utils/api';

/**
 * Pods landing — your pods + a "discover public pods" tab + create modal.
 */
export default function Pods() {
  const [tab, setTab] = useState('mine');
  const [mine, setMine] = useState([]);
  const [discover, setDiscover] = useState([]);
  const [loading, setLoading] = useState(true);

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  const load = () => {
    setLoading(true);
    Promise.all([
      api.get('/pods/me').then(r => r.data).catch(() => []),
      api.get('/pods/discover').then(r => r.data).catch(() => []),
    ]).then(([m, d]) => {
      setMine(m); setDiscover(d);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    setCreateError('');
    setCreating(true);
    try {
      await api.post('/pods/', { name, description: description || null, is_private: isPrivate });
      setShowCreate(false);
      setName(''); setDescription(''); setIsPrivate(false);
      load();
    } catch (e) {
      setCreateError(e.response?.data?.detail || 'Could not create pod');
    } finally {
      setCreating(false);
    }
  };

  const list = tab === 'mine' ? mine : discover;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Layers size={20} style={{ color: 'var(--accent)' }} />
          <h1 className="text-xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Pods</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 text-sm font-semibold px-3 py-1.5 rounded-md border-none cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
        >
          <Plus size={14} /> New pod
        </button>
      </div>
      <p className="text-xs m-0 mb-4" style={{ color: 'var(--text-muted)' }}>
        Small groups with a shared feed. Useful for an investment club, study group, or family circle.
      </p>

      <div
        className="flex p-1 rounded-xl mb-4"
        style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)' }}
      >
        {[{ key: 'mine', label: 'My pods' }, { key: 'discover', label: 'Discover' }].map((t) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-lg text-sm font-semibold border-none cursor-pointer"
              style={{
                backgroundColor: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                boxShadow: active ? 'var(--shadow)' : 'none',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>Loading…</p>
      ) : list.length === 0 ? (
        <div className="rounded-xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm m-0 mb-1" style={{ color: 'var(--text-primary)' }}>
            {tab === 'mine' ? "You're not in any pods yet." : 'No public pods to discover yet.'}
          </p>
          <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
            {tab === 'mine' ? 'Create one or join a public pod to see it here.' : 'Be the first to create one.'}
          </p>
        </div>
      ) : (
        <ul className="m-0 pl-0 list-none space-y-2">
          {list.map(p => (
            <li key={p.id}>
              <Link
                to={`/pods/${p.slug}`}
                className="rounded-xl block p-4 no-underline"
                style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-sm font-semibold m-0">{p.name}</h3>
                  {p.is_private && <Lock size={12} style={{ color: 'var(--text-muted)' }} />}
                </div>
                {p.description && (
                  <p className="text-xs m-0 mb-2" style={{ color: 'var(--text-secondary)' }}>{p.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <Users size={11} />
                  {p.member_count} {p.member_count === 1 ? 'member' : 'members'}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="w-full max-w-sm rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold m-0">Create a pod</h3>
              <button onClick={() => setShowCreate(false)} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
                <X size={16} />
              </button>
            </div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Naspers nerds"
              className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-3"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What's this pod for?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
            />
            <label className="flex items-center gap-2 mb-3 cursor-pointer">
              <input type="checkbox" checked={isPrivate} onChange={(e) => setIsPrivate(e.target.checked)}
                className="w-4 h-4" style={{ accentColor: 'var(--accent)' }} />
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Private (invite-only)</span>
            </label>
            {createError && (
              <p className="text-xs m-0 mb-2" style={{ color: 'var(--danger)' }}>{createError}</p>
            )}
            <button
              onClick={create}
              disabled={creating || name.length < 3}
              className="w-full py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 border-none cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
