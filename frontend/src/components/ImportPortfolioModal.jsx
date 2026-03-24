import { useState } from 'react';
import { X, Upload, FileSpreadsheet, Check, ExternalLink } from 'lucide-react';
import api from '../utils/api';

const STEPS = ['guide', 'upload', 'preview', 'done'];

export default function ImportPortfolioModal({ onClose, onImported }) {
  const [step, setStep] = useState('guide');
  const [file, setFile] = useState(null);
  const [accountType, setAccountType] = useState('ZAR');
  const [preview, setPreview] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    setFile(f);
    setError('');

    // Preview
    const formData = new FormData();
    formData.append('file', f);
    try {
      const res = await api.post('/portfolio/import-preview', formData);
      setPreview(res.data);
      setStep('preview');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to read file');
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
      const res = await api.post('/portfolio/import-transactions', formData);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}>
      <div className="w-full max-w-md rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h2 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            {step === 'guide' && 'Import from EasyEquities'}
            {step === 'upload' && 'Upload file'}
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
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                Download your transaction history from EasyEquities and upload it here. We'll parse your buys and sells to build your portfolio.
              </p>

              <div className="space-y-3 mb-5">
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>1</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Log into EasyEquities</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>Go to easyequities.co.za on your computer</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>2</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Go to Transaction History</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>Click on your account → Statements → Transaction History</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>3</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Download as Excel</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>Select the last 12 months and download the .xlsx file</p>
                  </div>
                </div>
                <div className="flex gap-3 items-start">
                  <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0"
                    style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>4</div>
                  <div>
                    <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>Upload here</p>
                    <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>We'll parse your trades and build your portfolio</p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg p-3 mb-4 flex gap-2 items-start" style={{ backgroundColor: 'var(--accent-light)' }}>
                <FileSpreadsheet size={14} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
                <p className="text-xs m-0" style={{ color: 'var(--text-secondary)' }}>
                  Your file is processed securely and only your holdings data is stored. We never see your EasyEquities login credentials.
                </p>
              </div>

              <button onClick={() => setStep('upload')}
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                I have my file ready
              </button>
            </>
          )}

          {/* Step 2: Upload */}
          {step === 'upload' && (
            <>
              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Account type</label>
                <div className="flex gap-2">
                  {['ZAR', 'TFSA', 'USD'].map(t => (
                    <button key={t} onClick={() => setAccountType(t)}
                      className="flex-1 py-2 rounded-lg text-xs font-medium border-none cursor-pointer"
                      style={{
                        backgroundColor: accountType === t ? 'var(--accent-light)' : 'var(--bg-page)',
                        color: accountType === t ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${accountType === t ? '#C7D2FE' : 'var(--border)'}`,
                      }}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex flex-col items-center justify-center py-8 rounded-xl cursor-pointer transition-colors"
                style={{ border: '2px dashed var(--border)', backgroundColor: 'var(--bg-page)' }}>
                <Upload size={24} style={{ color: 'var(--text-muted)' }} />
                <p className="text-sm font-medium mt-2 m-0" style={{ color: 'var(--text-secondary)' }}>
                  {file ? file.name : 'Click to upload .xlsx file'}
                </p>
                <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>
                  EasyEquities Transaction History
                </p>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileSelect} className="hidden" />
              </label>

              {error && (
                <div className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                  <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
                </div>
              )}
            </>
          )}

          {/* Step 3: Preview */}
          {step === 'preview' && preview && (
            <>
              <div className="rounded-lg p-3 mb-4 flex items-center justify-between" style={{ backgroundColor: '#D1FAE5' }}>
                <span className="text-xs font-medium" style={{ color: 'var(--success)' }}>
                  Found {preview.total_stocks} stocks from {preview.total_transactions} transactions
                </span>
              </div>

              <div className="mb-4">
                <p className="text-[11px] font-medium uppercase tracking-wider mb-2 m-0" style={{ color: 'var(--text-muted)' }}>
                  Holdings to import
                </p>
                <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--border)' }}>
                  {preview.holdings.map((h, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2.5"
                      style={{ borderTop: i > 0 ? '1px solid var(--border)' : 'none' }}>
                      <div>
                        <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>{h.stock_name}</p>
                        <p className="text-[11px] m-0" style={{ color: 'var(--text-muted)' }}>
                          {h.buy_count} buy{h.buy_count !== 1 ? 's' : ''} · qty {h.quantity.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>
                        R{h.total_invested.toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>Account type</label>
                <div className="flex gap-2">
                  {['ZAR', 'TFSA', 'USD'].map(t => (
                    <button key={t} onClick={() => setAccountType(t)}
                      className="flex-1 py-1.5 rounded-lg text-xs font-medium border-none cursor-pointer"
                      style={{
                        backgroundColor: accountType === t ? 'var(--accent-light)' : 'var(--bg-page)',
                        color: accountType === t ? 'var(--accent)' : 'var(--text-muted)',
                        border: `1px solid ${accountType === t ? '#C7D2FE' : 'var(--border)'}`,
                      }}>
                      {t}
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
                className="w-full py-2.5 rounded-lg text-sm font-semibold border-none cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                {importing ? 'Importing...' : `Import ${preview.total_stocks} stocks`}
              </button>
            </>
          )}

          {/* Step 4: Done */}
          {step === 'done' && result && (
            <div className="text-center py-4">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: '#D1FAE5' }}>
                <Check size={24} style={{ color: 'var(--success)' }} />
              </div>
              <h3 className="text-base font-semibold m-0 mb-1" style={{ color: 'var(--text-primary)' }}>Portfolio imported!</h3>
              <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                {result.holdings_imported} stocks from {result.transactions_found} transactions
              </p>

              <div className="rounded-lg p-3 mb-4 text-left" style={{ backgroundColor: 'var(--bg-page)' }}>
                {result.stocks?.map((s, i) => (
                  <p key={i} className="text-xs m-0 mb-1" style={{ color: 'var(--text-primary)' }}>✓ {s}</p>
                ))}
              </div>

              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                Re-upload monthly to keep your portfolio up to date. We'll remind you.
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
