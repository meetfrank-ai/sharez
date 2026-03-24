import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Share2, ChevronDown, ChevronRight, Upload, FileSpreadsheet, Check } from 'lucide-react';
import api from '../utils/api';
import ImportPortfolioModal from '../components/ImportPortfolioModal';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [shareModal, setShareModal] = useState(null); // { txIds, stockName, action }
  const [noteBody, setNoteBody] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [sharing, setSharing] = useState(false);

  const fetchTransactions = () => {
    api.get('/portfolio/transactions')
      .then(res => setTransactions(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchTransactions(); }, []);

  // Group transactions by stock + date + action
  const grouped = [];
  const groupMap = {};
  transactions.forEach(tx => {
    const key = `${tx.stock_name}|${tx.transaction_date}|${tx.action}`;
    if (!groupMap[key]) {
      groupMap[key] = {
        key,
        stock_name: tx.stock_name,
        action: tx.action,
        date: tx.transaction_date,
        account_type: tx.account_type,
        transactions: [],
        total_qty: 0,
        total_shared: 0,
      };
      grouped.push(groupMap[key]);
    }
    groupMap[key].transactions.push(tx);
    groupMap[key].total_qty += tx.quantity;
    groupMap[key].total_shared += tx.shared_count || 0;
  });

  const filtered = filter === 'all' ? grouped
    : filter === 'buys' ? grouped.filter(g => g.action === 'buy')
    : grouped.filter(g => g.action === 'sell');

  const toggleSelect = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const handleShareSelected = () => {
    const txIds = [];
    let stockName = '';
    let action = 'buy';
    selected.forEach(key => {
      const group = groupMap[key];
      if (group) {
        group.transactions.forEach(t => txIds.push(t.id));
        stockName = group.stock_name;
        action = group.action;
      }
    });
    setShareModal({ txIds, stockName, action });
    setNoteBody('');
    setVisibility('public');
  };

  const handleShareGroup = (group) => {
    setShareModal({
      txIds: group.transactions.map(t => t.id),
      stockName: group.stock_name,
      action: group.action,
    });
    setNoteBody('');
    setVisibility('public');
  };

  const handleShare = async () => {
    if (!shareModal) return;
    setSharing(true);
    try {
      await api.post('/portfolio/transactions/share', null, {
        params: {
          transaction_ids: shareModal.txIds,
          visibility,
          note_body: noteBody,
        },
      });
      fetchTransactions();
      setShareModal(null);
      setSelected(new Set());
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to share');
    } finally {
      setSharing(false);
    }
  };

  const hasTransactions = transactions.length > 0;

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
    </div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Transactions</h1>
        {hasTransactions && (
          <button onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--bg-card)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
            <Upload size={14} /> Import more
          </button>
        )}
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-muted)' }}>
        Your imported trades. Share any transaction with a note to your feed.
      </p>

      {/* Empty state */}
      {!hasTransactions ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: 'var(--accent-light)' }}>
            <FileSpreadsheet size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-semibold m-0 mb-2" style={{ color: 'var(--text-primary)' }}>Import your transactions</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Download your transaction history from EasyEquities and upload it here. Your portfolio will be built automatically from your trades.
          </p>
          <button onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            <Upload size={18} /> Import from EasyEquities
          </button>
        </div>
      ) : (
        <>
          {/* Filters + multi-select actions */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex gap-1.5">
              {[
                { key: 'all', label: `All (${grouped.length})` },
                { key: 'buys', label: `Buys` },
                { key: 'sells', label: `Sells` },
              ].map(f => (
                <button key={f.key} onClick={() => setFilter(f.key)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium border-none cursor-pointer"
                  style={{
                    backgroundColor: filter === f.key ? 'var(--accent-light)' : 'transparent',
                    color: filter === f.key ? 'var(--accent)' : 'var(--text-muted)',
                    border: filter === f.key ? '1px solid #C7D2FE' : '1px solid var(--border)',
                  }}>
                  {f.label}
                </button>
              ))}
            </div>
            {selected.size > 0 && (
              <button onClick={handleShareSelected}
                className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                <Share2 size={12} /> Share {selected.size} selected
              </button>
            )}
          </div>

          {/* Grouped transaction list */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            {filtered.map((group, i) => {
              const isBuy = group.action === 'buy';
              const isExpanded = expandedGroup === group.key;
              const isSelected = selected.has(group.key);
              const hasMultiple = group.transactions.length > 1;

              return (
                <div key={group.key} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  {/* Group header */}
                  <div className="flex items-center gap-3 px-4 py-3">
                    {/* Checkbox */}
                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(group.key)}
                      className="w-4 h-4 rounded shrink-0" style={{ accentColor: 'var(--accent)' }} />

                    {/* Icon */}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: isBuy ? '#D1FAE5' : '#FEE2E2' }}>
                      {isBuy ? <TrendingUp size={15} style={{ color: '#16A34A' }} /> : <TrendingDown size={15} style={{ color: '#DC2626' }} />}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedGroup(isExpanded ? null : group.key)}>
                      <p className="text-sm font-medium m-0 truncate" style={{ color: 'var(--text-primary)' }}>{group.stock_name}</p>
                      <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {isBuy ? 'Bought' : 'Sold'} {Number(group.total_qty).toLocaleString(undefined, { maximumFractionDigits: 2 })} shares
                        {hasMultiple && ` · ${group.transactions.length} orders`}
                        {group.date && ` · ${group.date}`}
                        {' · '}{group.account_type}
                      </p>
                    </div>

                    {/* Expand arrow */}
                    {hasMultiple && (
                      <button onClick={() => setExpandedGroup(isExpanded ? null : group.key)}
                        className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    )}

                    {/* Shared badge */}
                    {group.total_shared > 0 && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                        Shared{group.total_shared > 1 ? ` ×${group.total_shared}` : ''}
                      </span>
                    )}

                    {/* Share button */}
                    <button onClick={() => handleShareGroup(group)}
                      className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer shrink-0"
                      style={{ backgroundColor: 'var(--bg-page)', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                      <Share2 size={12} /> Share
                    </button>
                  </div>

                  {/* Expanded fills */}
                  {isExpanded && (
                    <div className="pl-16 pr-4 pb-3">
                      {group.transactions.map((tx, j) => (
                        <div key={tx.id} className="flex items-center justify-between py-1.5 text-xs"
                          style={{ borderTop: j > 0 ? '1px dashed var(--border)' : 'none' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>
                            {Number(tx.quantity).toLocaleString(undefined, { maximumFractionDigits: 2 })} shares @ R{Number(tx.price).toLocaleString()}
                          </span>
                          <span style={{ color: 'var(--text-muted)' }}>{tx.transaction_date}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Share modal */}
      {shareModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setShareModal(null)}>
          <div className="w-full max-w-sm rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-semibold m-0 mb-4" style={{ color: 'var(--text-primary)' }}>Share to feed</h3>

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
              <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{shareModal.stockName}</p>
              <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {shareModal.txIds.length} transaction{shareModal.txIds.length > 1 ? 's' : ''}
              </p>
            </div>

            <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)}
              placeholder="Add a note about this trade (optional)"
              rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
              style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />

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

      {/* Import modal */}
      {showImport && (
        <ImportPortfolioModal
          onClose={() => setShowImport(false)}
          onImported={() => { fetchTransactions(); setShowImport(false); }}
        />
      )}
    </div>
  );
}
