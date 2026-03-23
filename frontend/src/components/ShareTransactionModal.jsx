import { useState } from 'react';
import { X, TrendingUp, TrendingDown, Send, Eye, EyeOff } from 'lucide-react';
import api from '../utils/api';

export default function ShareTransactionModal({ transactions, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [note, setNote] = useState('');
  const [sharing, setSharing] = useState(false);

  if (!transactions?.length || currentIndex >= transactions.length) return null;

  const tx = transactions[currentIndex];
  const isBuy = tx.type === 'buy';

  const handleShare = async (withNote = false) => {
    setSharing(true);
    try {
      await api.post('/portfolio/share-transaction', {
        contract_code: tx.contract_code,
        stock_name: tx.stock_name,
        transaction_type: tx.type,
        note: withNote && note.trim() ? note.trim() : null,
      });
    } catch {}
    setSharing(false);
    moveNext();
  };

  const moveNext = () => {
    setNote('');
    if (currentIndex + 1 < transactions.length) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-sm rounded-xl p-6" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isBuy
              ? <TrendingUp size={18} style={{ color: 'var(--success)' }} />
              : <TrendingDown size={18} style={{ color: 'var(--danger)' }} />
            }
            <div>
              <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                {isBuy ? 'New buy detected' : 'Sell detected'}
              </h3>
              <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                {currentIndex + 1} of {transactions.length}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Stock info */}
        <div className="rounded-lg p-4 mb-4 flex items-center gap-3" style={{ backgroundColor: 'var(--bg-page)' }}>
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: isBuy ? '#D1FAE5' : '#FEE2E2', color: isBuy ? 'var(--success)' : 'var(--danger)' }}>
            {tx.stock_name?.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{tx.stock_name}</p>
            <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>{tx.contract_code}</p>
          </div>
        </div>

        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          Would you like to share this with your followers?
        </p>

        {/* Optional note */}
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value.slice(0, 500))}
          placeholder={isBuy ? "Why did you buy this? (optional)" : "Why did you sell? (optional)"}
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-4"
          style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />

        {/* Actions */}
        <div className="space-y-2">
          <button
            onClick={() => handleShare(true)}
            disabled={sharing}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
          >
            <Eye size={14} />
            {note.trim() ? 'Share with note' : 'Share'}
          </button>
          <button
            onClick={moveNext}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            <EyeOff size={14} />
            Keep private
          </button>
        </div>
      </div>
    </div>
  );
}
