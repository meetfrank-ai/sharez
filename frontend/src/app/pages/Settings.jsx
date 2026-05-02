import { useEffect, useState } from 'react';
import { Mail, RefreshCw, Trash2, AlertCircle, Check } from 'lucide-react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

export default function Settings() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();

  const [status, setStatus] = useState({ connected: false, google_email: null, last_synced_at: null });
  const [statusLoading, setStatusLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);
  const [syncError, setSyncError] = useState('');

  // Email change
  const [newEmail, setNewEmail] = useState(user?.email || '');
  const [pwForEmail, setPwForEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  // Banner from OAuth callback redirect
  const callbackResult = params.get('gmail');
  const callbackCode = params.get('code');
  const callbackMessage = params.get('message');

  useEffect(() => {
    loadStatus();
  }, []);

  // Clear callback query params after a few seconds so the banner doesn't persist on refresh.
  useEffect(() => {
    if (callbackResult) {
      const t = setTimeout(() => {
        const next = new URLSearchParams(params);
        next.delete('gmail');
        next.delete('code');
        next.delete('message');
        setParams(next, { replace: true });
      }, 8000);
      return () => clearTimeout(t);
    }
  }, [callbackResult]);

  const loadStatus = async () => {
    setStatusLoading(true);
    try {
      const { data } = await api.get('/gmail/status');
      setStatus(data);
    } catch (err) {
      // not connected — that's fine
    } finally {
      setStatusLoading(false);
    }
  };

  const handleConnect = () => {
    // Send users through the dedicated explainer page so they see the privacy
    // breakdown before granting access. The OAuth flow itself is started there.
    navigate('/link-account');
  };

  const handleDisconnect = async () => {
    if (!confirm('Disconnect Gmail? Your synced trades stay; only the connection is removed.')) return;
    try {
      await api.post('/gmail/disconnect');
      await loadStatus();
    } catch (err) {
      setSyncError(err.response?.data?.detail || 'Could not disconnect.');
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setSyncError('');
    setSyncResult(null);
    try {
      const { data } = await api.post('/gmail/sync');
      setSyncResult(data);
      await loadStatus();
    } catch (err) {
      setSyncError(err.response?.data?.detail || 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  const handleEmailChange = async (e) => {
    e.preventDefault();
    setEmailMsg('');
    setEmailError('');
    setEmailSaving(true);
    try {
      const { data } = await api.put('/auth/email', { new_email: newEmail, password: pwForEmail });
      setUser({ ...user, email: data.email });
      setEmailMsg('Email updated. Reconnect Gmail with the new address.');
      setPwForEmail('');
      await loadStatus();
    } catch (err) {
      setEmailError(err.response?.data?.detail || 'Could not change email.');
    } finally {
      setEmailSaving(false);
    }
  };

  const cardStyle = {
    backgroundColor: 'var(--bg-card)',
    border: '1px solid var(--border)',
  };
  const inputStyle = {
    backgroundColor: '#FFFFFF',
    border: '1px solid var(--border)',
    color: 'var(--text-primary)',
  };
  const btnPrimary = {
    backgroundColor: 'var(--accent)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
        Settings
      </h1>

      {/* OAuth callback banner */}
      {callbackResult === 'connected' && (
        <div className="rounded-xl p-4 flex gap-3 items-start" style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <Check size={18} className="mt-0.5" style={{ color: 'var(--success)' }} />
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--success)' }}>Gmail connected.</p>
            <p className="text-xs m-0 mt-1" style={{ color: 'var(--text-secondary)' }}>
              Hit Sync below to import your EasyEquities trade history.
            </p>
          </div>
        </div>
      )}
      {callbackResult === 'error' && (
        <div className="rounded-xl p-4 flex gap-3 items-start" style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
          <AlertCircle size={18} className="mt-0.5" style={{ color: 'var(--danger)' }} />
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--danger)' }}>
              Gmail couldn't be connected ({callbackCode || 'unknown'})
            </p>
            {callbackMessage && (
              <p className="text-xs m-0 mt-1" style={{ color: 'var(--text-secondary)' }}>{callbackMessage}</p>
            )}
          </div>
        </div>
      )}

      {/* Gmail card */}
      <section className="rounded-xl p-5" style={cardStyle}>
        <div className="flex items-center gap-2 mb-3">
          <Mail size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            Gmail (EasyEquities trades)
          </h2>
        </div>

        {statusLoading ? (
          <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>Checking…</p>
        ) : status.connected ? (
          <>
            <p className="text-sm m-0 mb-1" style={{ color: 'var(--text-primary)' }}>
              Connected as <strong>{status.google_email}</strong>
            </p>
            <p className="text-xs m-0 mb-4" style={{ color: 'var(--text-muted)' }}>
              {status.last_synced_at
                ? `Last synced ${new Date(status.last_synced_at).toLocaleString()}`
                : 'Not synced yet'}
            </p>

            <div className="flex gap-2">
              <button
                onClick={handleSync}
                disabled={syncing}
                className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50 flex items-center gap-2"
                style={btnPrimary}
              >
                <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
                {syncing ? 'Syncing…' : 'Sync now'}
              </button>
              <button
                onClick={handleDisconnect}
                className="px-4 py-2 rounded-lg text-sm font-semibold border bg-transparent flex items-center gap-2"
                style={{ borderColor: 'var(--border)', color: 'var(--danger)', cursor: 'pointer' }}
              >
                <Trash2 size={14} />
                Disconnect
              </button>
            </div>

            {syncResult && (
              <div className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#ECFDF5' }}>
                <p className="text-xs m-0" style={{ color: 'var(--success)' }}>
                  Synced {syncResult.new_trades ?? 0} new trades
                  {typeof syncResult.scanned === 'number' ? ` (${syncResult.scanned} emails scanned)` : ''}.
                </p>
              </div>
            )}
            {syncError && (
              <div className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{syncError}</p>
              </div>
            )}
          </>
        ) : (
          <>
            <p className="text-sm m-0 mb-2" style={{ color: 'var(--text-secondary)' }}>
              Not connected. We'll only read messages from <strong>info@easyequities.co.za</strong>.
            </p>
            <p className="text-xs m-0 mb-4" style={{ color: 'var(--text-muted)' }}>
              Your account email is <strong>{user?.email}</strong>. Make sure that's where your EE confirmations arrive.
            </p>
            <button onClick={handleConnect} className="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2" style={btnPrimary}>
              <Mail size={14} />
              Connect Gmail
            </button>
            {syncError && (
              <div className="mt-3 rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{syncError}</p>
              </div>
            )}
          </>
        )}
      </section>

      {/* Change email */}
      <section className="rounded-xl p-5" style={cardStyle}>
        <h2 className="text-base font-semibold m-0 mb-1" style={{ color: 'var(--text-primary)' }}>
          Account email
        </h2>
        <p className="text-xs m-0 mb-4" style={{ color: 'var(--text-muted)' }}>
          This must match the Gmail address where EasyEquities sends your confirmations. Changing it disconnects Gmail.
        </p>

        <form onSubmit={handleEmailChange} className="space-y-3">
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>New email</label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Confirm with password</label>
            <input
              type="password"
              value={pwForEmail}
              onChange={(e) => setPwForEmail(e.target.value)}
              required
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none"
              style={inputStyle}
            />
          </div>
          {emailError && (
            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
              <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{emailError}</p>
            </div>
          )}
          {emailMsg && (
            <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#ECFDF5' }}>
              <p className="text-xs m-0" style={{ color: 'var(--success)' }}>{emailMsg}</p>
            </div>
          )}
          <button
            type="submit"
            disabled={emailSaving || newEmail === user?.email}
            className="px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-50"
            style={btnPrimary}
          >
            {emailSaving ? 'Saving…' : 'Update email'}
          </button>
        </form>
      </section>
    </div>
  );
}
