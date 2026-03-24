import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, Plus, Minus, Upload, FileSpreadsheet, Send, X } from 'lucide-react';
import api from '../utils/api';
import ImportPortfolioModal from '../components/ImportPortfolioModal';

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [filter, setFilter] = useState('all');
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [showComposer, setShowComposer] = useState(false);
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

  // Group by stock + date + action
  const grouped = [];
  const groupMap = {};
  transactions.forEach(tx => {
    const key = `${tx.stock_name}|${tx.transaction_date}|${tx.action}`;
    if (!groupMap[key]) {
      groupMap[key] = { key, stock_name: tx.stock_name, action: tx.action, date: tx.transaction_date,
        account_type: tx.account_type, transactions: [], total_qty: 0, total_shared: 0 };
      grouped.push(groupMap[key]);
    }
    groupMap[key].transactions.push(tx);
    groupMap[key].total_qty += tx.quantity;
    groupMap[key].total_shared += tx.shared_count || 0;
  });

  const filtered = filter === 'all' ? grouped : filter === 'buys' ? grouped.filter(g => g.action === 'buy') : grouped.filter(g => g.action === 'sell');

  const toggleSelect = (key) => {
    const next = new Set(selected);
    if (next.has(key)) next.delete(key); else next.add(key);
    setSelected(next);
  };

  const getSelectedTxIds = () => {
    const ids = [];
    selected.forEach(key => { const g = groupMap[key]; if (g) g.transactions.forEach(t => ids.push(t.id)); });
    return ids;
  };

  const getSelectedStockNames = () => [...new Set([...selected].map(k => groupMap[k]?.stock_name).filter(Boolean))];

  const handleShare = async () => {
    const txIds = getSelectedTxIds();
    if (!txIds.length) return;
    setSharing(true);
    try {
      await api.post('/portfolio/transactions/share', null, {
        params: { transaction_ids: txIds, visibility, note_body: noteBody },
      });
      fetchTransactions();
      setShowComposer(false);
      setSelected(new Set());
      setNoteBody('');
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
        {hasTransactions ? 'Tap to select transactions, then share as a note.' : 'Import your EasyEquities transactions to get started.'}
      </p>

      {!hasTransactions ? (
        <div className="rounded-2xl p-8 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5" style={{ backgroundColor: 'var(--accent-light)' }}>
            <FileSpreadsheet size={32} style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-lg font-semibold m-0 mb-2" style={{ color: 'var(--text-primary)' }}>Import your transactions</h2>
          <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: 'var(--text-secondary)' }}>
            Download your transaction history from EasyEquities and upload it here.
          </p>
          <button onClick={() => setShowImport(true)}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold border-none cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            <Upload size={18} /> Import from EasyEquities
          </button>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-1.5 mb-4">
            {[
              { key: 'all', label: `All (${grouped.length})` },
              { key: 'buys', label: 'Buys' },
              { key: 'sells', label: 'Sells' },
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

          {/* Share bar — appears when transactions selected */}
          {selected.size > 0 && (
            <div className="flex items-center justify-between mb-4 px-4 py-3 rounded-xl"
              style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #C7D2FE' }}>
              <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                {selected.size} selected
              </span>
              <div className="flex items-center gap-2">
                <button onClick={() => setSelected(new Set())}
                  className="text-xs bg-transparent border-none cursor-pointer" style={{ color: 'var(--text-muted)' }}>Clear</button>
                <button onClick={() => { setShowComposer(true); setNoteBody(''); }}
                  className="flex items-center gap-1 px-4 py-1.5 rounded-lg text-xs font-semibold border-none cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                  Share
                </button>
              </div>
            </div>
          )}

          {/* Transaction list */}
          <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            {filtered.map((group, i) => {
              const isBuy = group.action === 'buy';
              const isExpanded = expandedGroup === group.key;
              const isSelected = selected.has(group.key);
              const hasMultiple = group.transactions.length > 1;

              return (
                <div key={group.key} style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                    onClick={() => toggleSelect(group.key)}
                    style={{ backgroundColor: isSelected ? 'var(--accent-light)' : 'transparent' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: isBuy ? '#D1FAE5' : '#FEE2E2' }}>
                      {isBuy ? <TrendingUp size={15} style={{ color: '#16A34A' }} /> : <TrendingDown size={15} style={{ color: '#DC2626' }} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={`text-sm m-0 truncate ${isSelected ? 'font-bold' : 'font-medium'}`} style={{ color: 'var(--text-primary)' }}>
                        {group.stock_name}
                      </p>
                      <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {isBuy ? 'Bought' : 'Sold'} {Number(group.total_qty).toLocaleString(undefined, { maximumFractionDigits: 2 })} shares
                        {hasMultiple && ` · ${group.transactions.length} orders`}
                        {group.date && ` · ${group.date}`}
                      </p>
                    </div>

                    {group.total_shared > 0 && (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0"
                        style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
                        Shared{group.total_shared > 1 ? ` ×${group.total_shared}` : ''}
                      </span>
                    )}

                    {hasMultiple && (
                      <button onClick={(e) => { e.stopPropagation(); setExpandedGroup(isExpanded ? null : group.key); }}
                        className="w-6 h-6 rounded-full flex items-center justify-center border-none cursor-pointer shrink-0"
                        style={{ backgroundColor: 'var(--bg-page)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
                        {isExpanded ? <Minus size={12} /> : <Plus size={12} />}
                      </button>
                    )}
                  </div>

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

      {/* Note composer modal — same as feed note with tagged transactions */}
      {showComposer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={() => setShowComposer(false)}>
          <div className="w-full max-w-full md:max-w-lg rounded-none md:rounded-xl p-5 md:p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Create note</h3>
              <button onClick={() => setShowComposer(false)} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Tagged transactions */}
            <div className="flex flex-wrap gap-1.5 mb-3">
              {getSelectedStockNames().map((name, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium"
                  style={{ backgroundColor: '#D1FAE5', color: '#16A34A' }}>
                  ↑ {name}
                </span>
              ))}
              <span className="text-[11px] self-center" style={{ color: 'var(--text-muted)' }}>
                {getSelectedTxIds().length} transaction{getSelectedTxIds().length > 1 ? 's' : ''} tagged
              </span>
            </div>

            <textarea value={noteBody} onChange={e => setNoteBody(e.target.value)}
              placeholder="Write your thoughts about this trade..."
              rows={4} autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
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
              className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
              <Send size={14} /> {sharing ? 'Posting...' : 'Post note'}
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <ImportPortfolioModal
          onClose={() => setShowImport(false)}
          onImported={() => { fetchTransactions(); setShowImport(false); }}
        />
      )}
    </div>
  );
}
