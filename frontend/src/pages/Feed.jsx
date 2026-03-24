import { useState, useEffect, useRef } from 'react';
import { Search, Send } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import FeedItem from '../components/FeedItem';
import NoteCard from '../components/NoteCard';

const FILTERS = [
  { key: 'all', label: 'For you' },
  { key: 'notes', label: 'Notes' },
  { key: 'transactions', label: 'Transactions' },
];

export default function Feed() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [scope, setScope] = useState('blend'); // 'blend' | 'community'
  const [search, setSearch] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [loading, setLoading] = useState(true);

  // Composer
  const [composerBody, setComposerBody] = useState('');
  const [composerVisibility, setComposerVisibility] = useState('public');
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef(null);
  const remaining = 500 - composerBody.length;

  const fetchFeed = (f = filter, s = scope) => {
    setLoading(true);
    api.get(`/feed/?filter=${f}&scope=${s}`)
      .then((res) => setItems(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchFeed(); }, []);

  const handleFilterChange = (f) => {
    setFilter(f);
    fetchFeed(f, scope);
  };

  const handleScopeChange = (s) => {
    setScope(s);
    fetchFeed(filter, s);
  };

  const handlePost = async () => {
    if (!composerBody.trim() || posting) return;
    setPosting(true);
    try {
      await api.post('/notes/', { body: composerBody.trim(), visibility: composerVisibility });
      setComposerBody('');
      setComposerExpanded(false);
      fetchFeed();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  // Client-side search filter
  let displayItems = items;
  if (search.trim()) {
    const q = search.toLowerCase();
    displayItems = items.filter((item) => {
      const text = `${item.body || ''} ${item.stock_name || ''} ${item.display_name || ''} ${item.handle || ''} ${item.metadata?.stock_name || ''}`;
      return text.toLowerCase().includes(q);
    });
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Feed</h1>
        <button
          onClick={() => setShowSearch(!showSearch)}
          className="w-9 h-9 rounded-lg flex items-center justify-center border-none cursor-pointer transition-colors"
          style={{
            backgroundColor: showSearch ? 'var(--accent-light)' : 'transparent',
            color: showSearch ? 'var(--accent)' : 'var(--text-muted)',
          }}
        >
          <Search size={18} />
        </button>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search notes, stocks, people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
            className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
        </div>
      )}

      {/* Composer */}
      <div
        className="rounded-xl mb-5"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
      >
        {!composerExpanded ? (
          <button
            onClick={() => { setComposerExpanded(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
            className="w-full flex items-center gap-3 px-5 py-4 bg-transparent border-none cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              {user?.display_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <span className="text-sm" style={{ color: 'var(--text-muted)' }}>What's on your mind?</span>
          </button>
        ) : (
          <div className="p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
                style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                {user?.display_name?.charAt(0).toUpperCase() || '?'}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold m-0 mb-1" style={{ color: 'var(--text-primary)' }}>{user?.display_name}</p>
                <textarea
                  ref={textareaRef}
                  value={composerBody}
                  onChange={(e) => setComposerBody(e.target.value.slice(0, 500))}
                  placeholder="Share a thought, stock pick, or hot take..."
                  rows={3}
                  className="w-full text-sm outline-none resize-none bg-transparent border-none p-0"
                  style={{ color: 'var(--text-primary)' }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3">
                <select value={composerVisibility} onChange={(e) => setComposerVisibility(e.target.value)}
                  className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <option value="public">Public</option>
                  <option value="inner_circle">Inner Circle</option>
                  <option value="vault">Vault</option>
                </select>
                <span className="text-xs" style={{ color: remaining < 50 ? 'var(--danger)' : 'var(--text-muted)' }}>{remaining}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => { setComposerExpanded(false); setComposerBody(''); }}
                  className="px-3 py-1.5 rounded-lg text-xs bg-transparent border-none cursor-pointer"
                  style={{ color: 'var(--text-muted)' }}>Cancel</button>
                <button onClick={handlePost} disabled={!composerBody.trim() || posting}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 border-none cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                  <Send size={13} />{posting ? '...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Scope + Filter pills */}
      <div className="flex items-center gap-1.5 mb-5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
        {/* Scope toggle */}
        {[
          { key: 'blend', label: 'For you' },
          { key: 'community', label: 'My community' },
        ].map((s) => (
          <button
            key={s.key}
            onClick={() => handleScopeChange(s.key)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border-none cursor-pointer"
            style={{
              backgroundColor: scope === s.key ? 'var(--accent-light)' : 'transparent',
              color: scope === s.key ? 'var(--accent)' : 'var(--text-muted)',
              border: scope === s.key ? '1px solid #C7D2FE' : '1px solid var(--border)',
            }}
          >
            {s.label}
          </button>
        ))}

        <div className="w-px h-4 shrink-0" style={{ backgroundColor: 'var(--border)' }} />

        {/* Content filter */}
        {FILTERS.filter(f => f.key !== 'all').map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(filter === f.key ? 'all' : f.key)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border-none cursor-pointer"
            style={{
              backgroundColor: filter === f.key ? 'var(--accent-light)' : 'transparent',
              color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
              border: filter === f.key ? '1px solid #C7D2FE' : '1px solid var(--border)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
        </div>
      ) : displayItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
            {search ? 'No results found' : filter === 'all' ? 'No activity yet' : `No ${filter} yet`}
          </p>
          {!search && filter === 'all' && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Follow some investors to see their updates</p>
          )}
        </div>
      ) : (
        displayItems.map((item) => {
          if (item.item_type === 'note') return <NoteCard key={`note-${item.id}`} note={item} />;
          if (item.item_type === 'thesis') return null; // v2: long-form articles
          if (item.item_type === 'transaction') return <FeedItem key={`tx-${item.id}`} event={item} />;
          return null;
        })
      )}
    </div>
  );
}
