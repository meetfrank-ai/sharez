import { useState } from 'react';
import { X, Check } from 'lucide-react';
import api from '../utils/api';

const PRESET_REASONS = [
  'Growth potential',
  'Dividend income',
  'Undervalued',
  'Strong brand',
  'Innovation',
  'Stable earnings',
  'Africa growth',
  'Short-term trade',
];

export default function InvestmentReasonModal({ stocks, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedReasons, setSelectedReasons] = useState([]);
  const [freeText, setFreeText] = useState('');
  const [saving, setSaving] = useState(false);

  if (!stocks?.length || currentIndex >= stocks.length) return null;

  const stock = stocks[currentIndex];

  const toggleReason = (reason) => {
    setSelectedReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/portfolio/investment-reason', {
        contract_code: stock.contract_code,
        stock_name: stock.stock_name,
        reasons: selectedReasons,
        free_text: freeText || null,
      });
    } catch {}
    setSaving(false);
    moveNext();
  };

  const moveNext = () => {
    setSelectedReasons([]);
    setFreeText('');
    if (currentIndex + 1 < stocks.length) {
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
          <div>
            <h3 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
              Why {stock.stock_name}?
            </h3>
            <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {currentIndex + 1} of {stocks.length} new stock{stocks.length > 1 ? 's' : ''}
            </p>
          </div>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <p className="text-sm mb-3" style={{ color: 'var(--text-secondary)' }}>
          What's your reason for investing? This helps the community understand investment decisions.
        </p>

        {/* Preset reason pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PRESET_REASONS.map((reason) => {
            const selected = selectedReasons.includes(reason);
            return (
              <button
                key={reason}
                onClick={() => toggleReason(reason)}
                className="flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all border-none cursor-pointer"
                style={{
                  backgroundColor: selected ? 'var(--accent-light)' : 'var(--bg-page)',
                  color: selected ? 'var(--accent)' : 'var(--text-secondary)',
                  border: selected ? '1px solid #C7D2FE' : '1px solid var(--border)',
                }}
              >
                {selected && <Check size={12} />}
                {reason}
              </button>
            );
          })}
        </div>

        {/* Free text */}
        <textarea
          value={freeText}
          onChange={(e) => setFreeText(e.target.value)}
          placeholder="Anything else? (optional)"
          rows={2}
          className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-4"
          style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
        />

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={moveNext}
            className="flex-1 py-2.5 rounded-lg text-xs font-medium cursor-pointer"
            style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}
          >
            Skip
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedReasons.length === 0}
            className="flex-1 py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40 border-none cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
          >
            {saving ? '...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
