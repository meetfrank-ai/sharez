import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Share2, Send, X, MessageCircle } from 'lucide-react';
import api from '../utils/api';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModal, setShareModal] = useState(null); // tx object or null
  const [noteBody, setNoteBody] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [sharing, setSharing] = useState(false);
  const [filter, setFilter] = useState('all'); // all, buys, sells

  useEffect(() => {
    api.get('/portfolio/transactions')
      .then(res => setTransactions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleShare = async () => {
    if (!shareModal) return;
    setSharing(true);
    try {
      await api.post(`/portfolio/transactions/${shareModal.id}/share?visibility=${visibility}&note_body=${encodeURIComponent(noteBody)}`);
      setTransactions(prev => prev.map(t =>
        t.id === shareModal.id ? { ...t, shared_count: (t.shared_count || 0) + 1 } : t
      ));
      setShareModal(null);
      setNoteBody('');
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to share');
    } finally {
      setSharing(false);
    }
  };

  const filtered = filter === 'all' ? transactions
    : filter === 'buys' ? transactions.filter(t => t.action === 'buy')
    : transactions.filter(t => t.action === 'sell');

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
    </div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold mb-2 m-0" style={{ color: 'var(--text-primary)' }}>Transactions</h1>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Your imported trades. Share any transaction to your feed with a note.
      </p>

      {/* Filters */}
      <div className="flex gap-1.5 mb-5">
        {[
          { key: 'all', label: `All (${transactions.length})` },
          { key: 'buys', label: `Buys (${transactions.filter(t => t.action === 'buy').length})` },
          { key: 'sells', label: `Sells (${transactions.filter(t => t.action === 'sell').length})` },
        ].map(f => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className="px-3.5 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer"
            style={{
              backgroundColor: filter === f.key ? 'var(--accent-light)' : 'transparent',
              color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
              border: filter === f.key ? '1px solid #C7D2FE' : '1px solid var(--border)',
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm m-0" style={{ color: 'var(--text-muted)' }}>
            {transactions.length === 0 ? 'No transactions imported yet' : 'No matching transactions'}
          </p>
          {transactions.length === 0 && (
            <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>
              Import your EasyEquities transaction history from the Portfolio page
            </p>
          )}
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          {filtered.map((tx, i) => {
            const isBuy = tx.action === 'buy';
            return (
              <div key={tx.id} className="flex items-center gap-3 px-4 py-3"
                style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                {/* Icon */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: isBuy ? '#D1FAE5' : '#FEE2E2' }}>
                  {isBuy
                    ? <TrendingUp size={15} style={{ color: '#16A34A' }} />
                    : <TrendingDown size={15} style={{ color: '#DC2626' }} />
                  }
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium m-0 truncate" style={{ color: 'var(--text-primary)' }}>
                    {tx.stock_name}
                  </p>
                  <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {isBuy ? 'Bought' : 'Sold'} {Number(tx.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} shares
                    {tx.transaction_date && ` · ${tx.transaction_date}`}
                    {' · '}{tx.account_type}
                  </p>
                </div>

                {/* Shared badge */}
                {tx.shared_count > 0 && (
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                    Shared{tx.shared_count > 1 ? ` ×${tx.shared_count}` : ''}
                  </span>
                )}

                {/* Share button */}
                <button onClick={() => { setShareModal(tx); setNoteBody(''); setVisibility('public'); }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer shrink-0"
                  style={{ backgroundColor: 'var(--bg-page)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                  <Share2 size={12} /> Share
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setShareModal(null)}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Share transaction</h3>
              <button onClick={() => setShareModal(null)} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Transaction preview */}
            <div className="rounded-lg p-3 mb-4" style={{
              backgroundColor: shareModal.action === 'buy' ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${shareModal.action === 'buy' ? '#BBF7D0' : '#FECACA'}`,
            }}>
              <div className="flex items-center gap-1.5 mb-1">
                {shareModal.action === 'buy'
                  ? <TrendingUp size={14} style={{ color: '#16A34A' }} />
                  : <TrendingDown size={14} style={{ color: '#DC2626' }} />
                }
                <span className="text-xs font-semibold" style={{ color: shareModal.action === 'buy' ? '#16A34A' : '#DC2626' }}>
                  {shareModal.action === 'buy' ? 'Bought' : 'Sold'}
                </span>
              </div>
              <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{shareModal.stock_name}</p>
              <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {shareModal.transaction_date} · {shareModal.account_type}
              </p>
            </div>

            {/* Note */}
            <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)}
              placeholder={shareModal.action === 'buy' ? "Why did you buy this? (optional)" : "Why did you sell? (optional)"}
              rows={3}
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
              style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />

            {/* Visibility */}
            <div className="mb-4">
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Who can see this?</label>
              <div className="flex gap-2">
                {['public', 'inner_circle', 'vault'].map(v => (
                  <button key={v} onClick={() => setVisibility(v)}
                    className="flex-1 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer capitalize"
                    style={{
                      backgroundColor: visibility === v ? 'var(--accent-light)' : 'var(--bg-page)',
                      color: visibility === v ? 'var(--accent)' : 'var(--text-muted)',
                      border: `1px solid ${visibility === v ? '#C7D2FE' : 'var(--border)'}`,
                    }}>
                    {v === 'inner_circle' ? 'Inner Circle' : v === 'vault' ? 'Vault' : 'Public'}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleShare} disabled={sharing}
              className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
              {sharing ? 'Sharing...' : 'Share to feed'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
