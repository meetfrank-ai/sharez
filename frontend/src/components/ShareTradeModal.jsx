import { useState } from 'react';
import { X, Upload, TrendingUp, TrendingDown, Check, Shield, Edit3 } from 'lucide-react';
import api from '../utils/api';

export default function ShareTradeModal({ onClose, onTradeShared }) {
  const [step, setStep] = useState('upload'); // upload, review, done
  const [file, setFile] = useState(null);
  const [extracting, setExtracting] = useState(false);
  const [extraction, setExtraction] = useState(null);
  const [error, setError] = useState('');

  // Editable fields
  const [action, setAction] = useState('buy');
  const [stockName, setStockName] = useState('');
  const [ticker, setTicker] = useState('');
  const [tradeDate, setTradeDate] = useState('');
  const [accountType, setAccountType] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [posting, setPosting] = useState(false);

  const handleFileSelect = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setError('');
    setExtracting(true);

    const formData = new FormData();
    formData.append('file', f);

    try {
      const res = await api.post('/trades/extract', formData);
      const data = res.data;

      if (data.error || data.confidence === 'low') {
        setError(data.error || "Couldn't recognise this as an EasyEquities screenshot. Try the order confirmation screen.");
        setExtracting(false);
        return;
      }

      setExtraction(data);
      setAction(data.action || 'buy');
      setStockName(data.stock_name || '');
      setTicker(data.ticker || '');
      setTradeDate(data.date || '');
      setAccountType(data.account_type || '');
      setStep('review');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to process screenshot');
    } finally {
      setExtracting(false);
    }
  };

  const handleShare = async () => {
    if (!stockName.trim()) return;
    setPosting(true);
    try {
      const market = (accountType || '').toLowerCase().includes('usd') ? 'US' : 'JSE';
      await api.post('/trades/', {
        action,
        stock_name: stockName,
        ticker: ticker || null,
        market,
        account_type: accountType || null,
        trade_date: tradeDate || null,
        amount_private: extraction?.amount_zar || null,
        share_price_private: extraction?.share_price || null,
        shares_private: extraction?.shares || null,
        screenshot_url: file ? 'uploaded' : null,
        ai_confidence: extraction?.confidence || null,
        visibility,
        note_body: noteBody || null,
      });
      setStep('done');
      onTradeShared?.();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to share trade');
    } finally {
      setPosting(false);
    }
  };

  const isBuy = action === 'buy';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            {step === 'upload' && 'Share a trade'}
            {step === 'review' && 'Confirm trade details'}
            {step === 'done' && 'Trade shared!'}
          </h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Upload step */}
          {step === 'upload' && (
            <>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Screenshot your EasyEquities order confirmation and upload it. Our AI will extract the trade details.
              </p>

              <label className="flex flex-col items-center justify-center py-10 rounded-xl cursor-pointer transition-colors"
                style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg-page)' }}>
                {extracting ? (
                  <>
                    <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin mb-2" style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>Extracting trade details...</p>
                  </>
                ) : (
                  <>
                    <Upload size={28} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium mt-2 m-0" style={{ color: 'var(--text-secondary)' }}>
                      {file ? file.name : 'Upload EE screenshot'}
                    </p>
                    <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>
                      PNG or JPEG from your camera roll
                    </p>
                  </>
                )}
                <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" disabled={extracting} />
              </label>

              {error && (
                <div className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                  <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
                </div>
              )}

              <div className="mt-4 rounded-lg p-3 flex gap-2 items-start" style={{ backgroundColor: 'var(--accent-light)' }}>
                <Shield size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <p className="text-xs m-0" style={{ color: 'var(--text-secondary)' }}>
                  Rand amounts are extracted for verification but <strong>never shown to other users</strong>.
                </p>
              </div>
            </>
          )}

          {/* Review step */}
          {step === 'review' && (
            <>
              {/* Trade card preview */}
              <div className="rounded-xl p-4 mb-4" style={{
                backgroundColor: isBuy ? '#D1FAE5' : '#FEE2E2',
                border: `1px solid ${isBuy ? '#A7F3D0' : '#FECACA'}`,
              }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {isBuy ? <TrendingUp size={16} style={{ color: 'var(--success)' }} /> : <TrendingDown size={16} style={{ color: 'var(--danger)' }} />}
                    <span className="text-sm font-semibold" style={{ color: isBuy ? 'var(--success)' : 'var(--danger)' }}>
                      {isBuy ? 'Bought' : 'Sold'}
                    </span>
                  </div>
                  {extraction?.confidence && (
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: '#D1FAE5', color: 'var(--success)' }}>
                      EE verified
                    </span>
                  )}
                </div>
                <p className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{stockName}</p>
                <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                  {ticker && `${ticker}.${(accountType || '').toLowerCase().includes('usd') ? 'US' : 'JSE'} · `}{tradeDate || 'Date unknown'}
                </p>
              </div>

              {/* Editable fields */}
              <div className="space-y-3 mb-4">
                <div className="flex gap-2">
                  <button onClick={() => setAction('buy')}
                    className="flex-1 py-2 rounded-lg text-xs font-medium border-none cursor-pointer"
                    style={{ backgroundColor: action === 'buy' ? '#D1FAE5' : 'var(--bg-page)', color: action === 'buy' ? 'var(--success)' : 'var(--text-muted)' }}>
                    Buy
                  </button>
                  <button onClick={() => setAction('sell')}
                    className="flex-1 py-2 rounded-lg text-xs font-medium border-none cursor-pointer"
                    style={{ backgroundColor: action === 'sell' ? '#FEE2E2' : 'var(--bg-page)', color: action === 'sell' ? 'var(--danger)' : 'var(--text-muted)' }}>
                    Sell
                  </button>
                </div>
                <input type="text" value={stockName} onChange={(e) => setStockName(e.target.value)}
                  placeholder="Stock name" className="w-full px-3 py-2 rounded-lg text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                <div className="flex gap-2">
                  <input type="text" value={ticker} onChange={(e) => setTicker(e.target.value)}
                    placeholder="Ticker" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                  <input type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
                    style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
                </div>
              </div>

              {/* Note */}
              <textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)}
                placeholder="Why did you make this trade? (optional)"
                rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-3"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />

              {/* Visibility */}
              <div className="flex items-center justify-between mb-4">
                <select value={visibility} onChange={(e) => setVisibility(e.target.value)}
                  className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <option value="public">Public</option>
                  <option value="inner_circle">Inner Circle</option>
                  <option value="vault">Vault</option>
                </select>
              </div>

              {error && (
                <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                  <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
                </div>
              )}

              <button onClick={handleShare} disabled={posting || !stockName.trim()}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                {posting ? 'Sharing...' : 'Share trade'}
              </button>
            </>
          )}

          {/* Done step */}
          {step === 'done' && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#D1FAE5' }}>
                <Check size={24} style={{ color: 'var(--success)' }} />
              </div>
              <h3 className="text-base font-semibold m-0 mb-1" style={{ color: 'var(--text-primary)' }}>Trade shared!</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Your {action === 'buy' ? 'buy' : 'sell'} of {stockName} is now visible to your followers.
              </p>
              <button onClick={onClose}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
