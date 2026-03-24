import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, Send, DollarSign, ArrowLeftRight, X, Check, Repeat2, TrendingUp, TrendingDown } from 'lucide-react';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';
import FeedItem from '../components/FeedItem';
import NoteCard from '../components/NoteCard';
import TradeCard from '../components/TradeCard';

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
  // Trade sharing moved to Transactions page
  const [loading, setLoading] = useState(true);

  // Composer
  const [composerBody, setComposerBody] = useState('');
  const [composerVisibility, setComposerVisibility] = useState('public');
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [composerStockTag, setComposerStockTag] = useState('');
  const [composerStockName, setComposerStockName] = useState('');
  const [composerTxIds, setComposerTxIds] = useState([]);
  const [composerTxNames, setComposerTxNames] = useState([]);
  const [showStockInput, setShowStockInput] = useState(false);
  const [showTxPicker, setShowTxPicker] = useState(false);
  const [myTransactions, setMyTransactions] = useState([]);
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef(null);

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
      if (composerTxIds.length > 0) {
        // Post as note with tagged transactions
        await api.post('/portfolio/transactions/share', null, {
          params: { transaction_ids: composerTxIds, visibility: composerVisibility, note_body: composerBody.trim() },
        });
      } else {
        await api.post('/notes/', {
          body: composerBody.trim(),
          visibility: composerVisibility,
          stock_tag: composerStockTag || null,
          stock_name: composerStockName || null,
        });
      }
      setComposerBody('');
      setComposerStockTag('');
      setComposerStockName('');
      setComposerTxIds([]);
      setComposerTxNames([]);
      setShowStockInput(false);
      setShowTxPicker(false);
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
            {/* Text area */}
            <textarea
              ref={textareaRef}
              value={composerBody}
              onChange={(e) => setComposerBody(e.target.value)}
              placeholder="What's happening?"
              rows={3}
              className="w-full text-sm outline-none resize-none bg-transparent border-none p-0 mb-3"
              style={{ color: 'var(--text-primary)' }}
            />

            {/* Tagged items pills */}
            {(composerStockName || composerTxNames.length > 0) && (
              <div className="flex flex-wrap items-center gap-1.5 mb-3">
                {composerStockName && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                    <DollarSign size={11} />{composerStockName}
                    <button onClick={() => { setComposerStockTag(''); setComposerStockName(''); }}
                      className="ml-0.5 bg-transparent border-none cursor-pointer p-0" style={{ color: 'var(--accent)' }}>
                      <X size={10} />
                    </button>
                  </span>
                )}
                {composerTxNames.map((name, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: '#D1FAE5', color: '#16A34A' }}>
                    ↑ {name}
                    <button onClick={() => {
                      setComposerTxIds([]); setComposerTxNames([]);
                    }} className="ml-0.5 bg-transparent border-none cursor-pointer p-0" style={{ color: '#16A34A' }}>
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Stock tag input */}
            {showStockInput && !composerStockName && (
              <div className="mb-3">
                <input type="text" placeholder="Stock name (e.g. Capitec Bank)" autoFocus
                  className="w-full px-3 py-2 rounded-lg text-xs outline-none"
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && e.target.value.trim()) {
                      const name = e.target.value.trim();
                      setComposerStockName(name);
                      setComposerStockTag(`EE_${name.replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 10)}`);
                      setShowStockInput(false);
                    }
                  }} />
                <p className="text-[10px] mt-1 m-0" style={{ color: 'var(--text-muted)' }}>Press Enter to tag</p>
              </div>
            )}

            {/* Transaction picker — grouped like Transactions page */}
            {showTxPicker && (() => {
              // Group transactions by stock + date + action
              const txGroups = [];
              const txGroupMap = {};
              myTransactions.forEach(tx => {
                const key = `${tx.stock_name}|${tx.transaction_date}|${tx.action}`;
                if (!txGroupMap[key]) {
                  txGroupMap[key] = { key, stock_name: tx.stock_name, action: tx.action, date: tx.transaction_date, transactions: [], total_qty: 0 };
                  txGroups.push(txGroupMap[key]);
                }
                txGroupMap[key].transactions.push(tx);
                txGroupMap[key].total_qty += tx.quantity;
              });

              return (
                <div className="mb-3 rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)', maxHeight: 220, overflowY: 'auto' }}>
                  {txGroups.length === 0 ? (
                    <p className="text-xs text-center py-4 m-0" style={{ color: 'var(--text-muted)' }}>No transactions imported yet</p>
                  ) : (
                    txGroups.slice(0, 15).map((group) => {
                      const allIds = group.transactions.map(t => t.id);
                      const isSelected = allIds.some(id => composerTxIds.includes(id));
                      const isBuy = group.action === 'buy';
                      return (
                        <div key={group.key}
                          className="flex items-center gap-2 px-3 py-2.5 cursor-pointer text-xs"
                          style={{ borderBottom: '1px solid var(--border)', backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent' }}
                          onClick={() => {
                            if (isSelected) {
                              setComposerTxIds(composerTxIds.filter(id => !allIds.includes(id)));
                              setComposerTxNames(composerTxNames.filter(n => n !== group.stock_name));
                            } else {
                              setComposerTxIds([...composerTxIds, ...allIds]);
                              if (!composerTxNames.includes(group.stock_name)) setComposerTxNames([...composerTxNames, group.stock_name]);
                            }
                          }}>
                          {isBuy ? <TrendingUp size={13} style={{ color: '#16A34A' }} /> : <TrendingDown size={13} style={{ color: '#DC2626' }} />}
                          <span className={`flex-1 truncate ${isSelected ? 'font-bold' : ''}`} style={{ color: 'var(--text-primary)' }}>
                            {group.stock_name}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>
                            {Number(group.total_qty).toLocaleString(undefined, { maximumFractionDigits: 1 })} shares
                            {group.transactions.length > 1 && ` · ${group.transactions.length}x`}
                          </span>
                        </div>
                      );
                    })
                  )}
                  <button onClick={() => setShowTxPicker(false)}
                    className="w-full py-2 text-xs font-medium bg-transparent border-none cursor-pointer"
                    style={{ color: 'var(--accent)' }}>Done</button>
                </div>
              );
            })()}

            {/* Attachment bar */}
            <div className="flex items-center gap-1 pb-3 mb-3 flex-wrap" style={{ borderBottom: '1px solid var(--border)' }}>
              <button onClick={() => { setShowStockInput(!showStockInput); setShowTxPicker(false); }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-transparent border-none cursor-pointer"
                style={{ color: showStockInput ? 'var(--accent)' : 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <DollarSign size={15} /> Stock
              </button>
              <button onClick={() => {
                  setShowTxPicker(!showTxPicker); setShowStockInput(false);
                  if (myTransactions.length === 0) api.get('/portfolio/transactions').then(r => setMyTransactions(r.data)).catch(() => {});
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs bg-transparent border-none cursor-pointer"
                style={{ color: showTxPicker ? 'var(--accent)' : 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <ArrowLeftRight size={15} /> Transaction
              </button>
            </div>

            {/* Bottom row: visibility + post */}
            <div className="flex items-center justify-between">
              <select value={composerVisibility} onChange={(e) => setComposerVisibility(e.target.value)}
                className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                <option value="public">Public</option>
                <option value="inner_circle">Inner Circle</option>
                <option value="vault">Vault</option>
              </select>
              <div className="flex items-center gap-2">
                <button onClick={() => { setComposerExpanded(false); setComposerBody(''); setComposerStockTag(''); setComposerStockName(''); setShowStockInput(false); }}
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
          if (item.item_type === 'reshare') return (
            <div key={`reshare-${item.id}-${item.reshared_by_id}`}>
              <div className="flex items-center gap-1.5 px-2 mb-1">
                <Repeat2 size={13} style={{ color: 'var(--success)' }} />
                <Link to={`/user/${item.reshared_by_id}`} className="text-xs font-medium no-underline" style={{ color: 'var(--success)' }}>
                  {item.reshared_by_name} restacked
                </Link>
              </div>
              <NoteCard note={item} />
            </div>
          );
          if (item.item_type === 'thesis') return null;
          if (item.item_type === 'trade') return <TradeCard key={`trade-${item.id}`} trade={item} />;
          if (item.item_type === 'transaction') return <FeedItem key={`tx-${item.id}`} event={item} />;
          return null;
        })
      )}

      {/* Trade sharing moved to Transactions page */}
    </div>
  );
}
