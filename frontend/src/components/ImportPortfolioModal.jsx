import { useState, useRef } from 'react';
import { X, Upload, FileSpreadsheet, Check, Shield, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function ImportPortfolioModal({ onClose, onImported }) {
  const [step, setStep] = useState('guide');
  const [file, setFile] = useState(null);
  const [accountType, setAccountType] = useState('ZAR');
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const f = e.target.files[0];
    if (!f) return;

    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      setError('Please upload an Excel file (.xlsx)');
      return;
    }

    setFile(f);
    setError('');
    setPreviewing(true);

    const formData = new FormData();
    formData.append('file', f);
    try {
      const res = await api.post('/portfolio/import-preview', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPreview(res.data);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to read file. Make sure it\'s the EasyEquities Transaction History .xlsx file.');
      setFile(null);
    } finally {
      setPreviewing(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setImporting(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('account_type', accountType);
      const res = await api.post('/portfolio/import-transactions', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(res.data);
      setStep('done');
      onImported?.(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '85vh', overflowY: 'auto' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            {step === 'guide' && 'Import from EasyEquities'}
            {step === 'upload' && 'Upload transaction history'}
            {step === 'preview' && 'Review import'}
            {step === 'done' && 'Import complete'}
          </h2>
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--text-muted)' }}>
            <X size={18} />
          </button>
        </div>

        <div className="p-5">
          {/* Step 1: Guide */}
          {step === 'guide' && (
            <>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                Download your past year's transactions from EasyEquities and upload the file here. We'll build your portfolio from your trades.
              </p>

              <div className="space-y-4 mb-5">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>1</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Log into EasyEquities</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Go to <strong>platform.easyequities.io</strong> on your computer
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>2</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Go to My Funds → Transactions</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      From the home page, click <strong>My Funds</strong> (middle-top) → then click <strong>Transactions</strong>
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>3</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Select your account</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Choose the account to export (e.g. <strong>EasyEquities ZAR</strong>, <strong>TFSA</strong>, or <strong>USD</strong>). Do each account separately.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>4</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Download past year's transactions</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Click <strong>"Download Past Year's Transactions"</strong> to download the .xlsx file
                    </p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>5</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Upload here</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      Come back and upload the file. We'll parse your trades automatically.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-3 mb-5 flex gap-2 items-start" style={{ backgroundColor: 'var(--accent-light)' }}>
                <Shield size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <p className="text-xs m-0" style={{ color: 'var(--text-secondary)' }}>
                  Your file is processed securely. We extract stock names and dates only — rand amounts are stored privately and <strong>never shown to other users</strong>.
                </p>
              </div>

              <button onClick={() => setStep('upload')}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                I have my file ready
              </button>
            </>
          )}

          {/* Step 2: Upload */}
          {step === 'upload' && (
            <>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  Which EasyEquities account is this for?
                </label>
                <div className="flex gap-2">
                  {[
                    { key: 'ZAR', label: 'EasyEquities ZAR' },
                    { key: 'TFSA', label: 'Tax Free (TFSA)' },
                    { key: 'USD', label: 'EasyEquities USD' },
                    { key: 'SATRIX', label: 'Satrix' },
                    { key: 'PROPERTY', label: 'EasyProperties' },
                    { key: 'CRYPTO', label: 'EasyCrypto' },
                  ].map(t => (
                    <button key={t.key} onClick={() => setAccountType(t.key)}
                      className="py-2 px-3 rounded-lg text-xs font-medium border-none cursor-pointer transition-all"
                      style={{
                        backgroundColor: accountType === t.key ? 'var(--accent-light)' : 'var(--bg-page)',
                        color: accountType === t.key ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${accountType === t.key ? '#C7D2FE' : 'var(--border)'}`,
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <label
                className="flex flex-col items-center justify-center py-10 rounded-xl cursor-pointer transition-all"
                style={{
                  border: '2px dashed var(--border)',
                  backgroundColor: previewing ? 'var(--accent-light)' : 'var(--bg-page)',
                }}
              >
                {previewing ? (
                  <>
                    <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent)' }} />
                    <p className="text-sm font-medium mt-3 m-0" style={{ color: 'var(--accent)' }}>
                      Reading your transactions...
                    </p>
                  </>
                ) : (
                  <>
                    <Upload size={28} style={{ color: 'var(--text-muted)' }} />
                    <p className="text-sm font-medium mt-3 m-0" style={{ color: 'var(--text-secondary)' }}>
                      {file ? file.name : 'Click to select your .xlsx file'}
                    </p>
                    <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>
                      Transaction History Report from EasyEquities
                    </p>
                  </>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                  disabled={previewing}
                />
              </label>

              {error && (
                <div className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                  <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
                </div>
              )}

              <button onClick={() => setStep('guide')}
                className="w-full mt-3 py-2 rounded-lg text-xs font-medium bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--text-muted)' }}>
                ← Back to instructions
              </button>
            </>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && preview && (
            <>
              <div className="rounded-lg p-3 mb-4 flex items-center gap-2" style={{ backgroundColor: '#D1FAE5' }}>
                <Check size={14} style={{ color: 'var(--success)' }} />
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
                  Found {preview.total_stocks} stock{preview.total_stocks !== 1 ? 's' : ''} from {preview.total_transactions} transaction{preview.total_transactions !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="mb-4">
                <p className="text-[11px] font-medium uppercase tracking-wider mb-2 m-0" style={{ color: 'var(--text-muted)' }}>
                  Holdings to import
                </p>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {preview.holdings.map((h, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5"
                      style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none', backgroundColor: 'var(--bg-card)' }}>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium m-0 truncate" style={{ color: 'var(--text-primary)' }}>{h.stock_name}</p>
                        <p className="text-[11px] m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {h.buy_count} buy{h.buy_count !== 1 ? 's' : ''}
                          {h.sell_count > 0 && `, ${h.sell_count} sell${h.sell_count !== 1 ? 's' : ''}`}
                          {' · '}qty {Number(h.quantity).toLocaleString(undefined, {maximumFractionDigits: 2})}
                        </p>
                      </div>
                      <p className="text-sm font-medium m-0 ml-3 shrink-0" style={{ color: 'var(--text-primary)' }}>
                        R{Number(h.total_invested).toLocaleString(undefined, {maximumFractionDigits: 0})}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Which account is this from?</label>
                <div className="flex flex-wrap gap-2">
                  {[
                    { key: 'ZAR', label: 'EasyEquities ZAR' },
                    { key: 'TFSA', label: 'TFSA' },
                    { key: 'USD', label: 'USD' },
                    { key: 'SATRIX', label: 'Satrix' },
                    { key: 'PROPERTY', label: 'EasyProperties' },
                    { key: 'CRYPTO', label: 'EasyCrypto' },
                  ].map(t => (
                    <button key={t.key} onClick={() => setAccountType(t.key)}
                      className="py-1.5 px-3 rounded-lg text-xs font-medium border-none cursor-pointer"
                      style={{
                        backgroundColor: accountType === t.key ? 'var(--accent-light)' : 'var(--bg-page)',
                        color: accountType === t.key ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${accountType === t.key ? '#C7D2FE' : 'var(--border)'}`,
                      }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div className="mb-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                  <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
                </div>
              )}

              <button onClick={handleImport} disabled={importing}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer disabled:opacity-50 transition-opacity hover:opacity-90"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                {importing ? 'Importing...' : `Import ${preview.total_stocks} stock${preview.total_stocks !== 1 ? 's' : ''}`}
              </button>

              <button onClick={() => { setStep('upload'); setFile(null); setPreview(null); setError(''); }}
                className="w-full mt-2 py-2 rounded-lg text-xs font-medium bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--text-muted)' }}>
                ← Upload a different file
              </button>
            </>
          )}

          {/* Step 4: Done */}
          {step === 'done' && result && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4" style={{ backgroundColor: '#D1FAE5' }}>
                <Check size={28} style={{ color: 'var(--success)' }} />
              </div>
              <h3 className="text-lg font-semibold m-0 mb-1" style={{ color: 'var(--text-primary)' }}>Portfolio imported!</h3>
              <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
                {result.holdings_imported} stock{result.holdings_imported !== 1 ? 's' : ''} from {result.transactions_found} transactions
              </p>

              <div className="rounded-lg p-4 mb-5 text-left" style={{ backgroundColor: 'var(--bg-page)' }}>
                {result.stocks?.map((s, i) => (
                  <div key={i} className="flex items-center gap-2 mb-1.5 last:mb-0">
                    <Check size={12} style={{ color: 'var(--success)' }} />
                    <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{s}</span>
                  </div>
                ))}
              </div>

              <div className="rounded-lg p-3 mb-5 flex gap-2 items-start text-left" style={{ backgroundColor: 'var(--accent-light)' }}>
                <FileSpreadsheet size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <p className="text-xs m-0" style={{ color: 'var(--text-secondary)' }}>
                  Re-upload monthly to keep your portfolio current. We'll send you a reminder.
                </p>
              </div>

              <button onClick={onClose}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer transition-opacity hover:opacity-90"
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
