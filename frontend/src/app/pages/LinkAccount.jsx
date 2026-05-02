import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Shield, Eye, Lock, ChevronLeft, Check, X } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

/**
 * Standalone "Link EasyEquities" page.
 *
 * Decoupled from signup so that account creation stays one quick step and
 * connecting a brokerage email is an explicit, well-explained second action
 * the user opts into when they're ready.
 */
export default function LinkAccount() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState({ connected: false, google_email: null });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/gmail/status')
      .then(({ data }) => setStatus(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleConnect = async () => {
    setError('');
    setConnecting(true);
    try {
      const { data } = await api.get('/gmail/connect');
      window.location.href = data.auth_url;
    } catch (err) {
      setConnecting(false);
      setError(err.response?.data?.detail || 'Could not start the connection. Try again or contact support.');
    }
  };

  const card = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' };
  const btnPrimary = { backgroundColor: 'var(--accent)', color: '#FFFFFF', border: 'none', cursor: 'pointer' };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-sm mb-4 bg-transparent border-none cursor-pointer"
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronLeft size={16} /> Back
      </button>

      <div className="text-center mb-6">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          <Mail size={28} />
        </div>
        <h1 className="text-xl font-semibold mb-2 m-0" style={{ color: 'var(--text-primary)' }}>
          Link your EasyEquities account
        </h1>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          We build your portfolio by reading the trade-confirmation emails EasyEquities already sends you. No password sharing.
        </p>
      </div>

      {!loading && status.connected && (
        <div className="rounded-xl p-4 mb-5 flex gap-3 items-start" style={{ backgroundColor: '#ECFDF5', border: '1px solid #A7F3D0' }}>
          <Check size={18} className="mt-0.5" style={{ color: 'var(--success)' }} />
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--success)' }}>
              Already connected as {status.google_email}
            </p>
            <p className="text-xs m-0 mt-1" style={{ color: 'var(--text-secondary)' }}>
              Manage the connection (sync, disconnect) in Settings.
            </p>
          </div>
        </div>
      )}

      {/* What we do */}
      <section className="rounded-xl p-5 mb-4" style={card}>
        <div className="flex items-center gap-2 mb-3">
          <Eye size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            What we do
          </h2>
        </div>
        <ul className="m-0 pl-0 space-y-2 list-none">
          <PrivacyItem icon={Check} positive>
            Read messages from <strong>info@easyequities.co.za</strong> only — your trade confirmations.
          </PrivacyItem>
          <PrivacyItem icon={Check} positive>
            Extract instrument, shares, price, and date from each email.
          </PrivacyItem>
          <PrivacyItem icon={Check} positive>
            Aggregate them into your portfolio and feed.
          </PrivacyItem>
        </ul>
      </section>

      {/* What we don't do */}
      <section className="rounded-xl p-5 mb-4" style={card}>
        <div className="flex items-center gap-2 mb-3">
          <Shield size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            What we never do
          </h2>
        </div>
        <ul className="m-0 pl-0 space-y-2 list-none">
          <PrivacyItem icon={X}>
            Read any email that isn't from EasyEquities. Other senders are filtered server-side before we even open the message.
          </PrivacyItem>
          <PrivacyItem icon={X}>
            Send, label, modify, or delete email. The permission we request is read-only.
          </PrivacyItem>
          <PrivacyItem icon={X}>
            Store full email bodies. Only the parsed structured fields go into our database.
          </PrivacyItem>
          <PrivacyItem icon={X}>
            Share your data with third parties or sell it.
          </PrivacyItem>
        </ul>
      </section>

      {/* How it stays secure */}
      <section className="rounded-xl p-5 mb-4" style={card}>
        <div className="flex items-center gap-2 mb-3">
          <Lock size={18} style={{ color: 'var(--accent)' }} />
          <h2 className="text-base font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            How it stays secure
          </h2>
        </div>
        <ul className="text-sm space-y-2 m-0 pl-4" style={{ color: 'var(--text-secondary)' }}>
          <li>The Google permission is <code style={codeStyle}>gmail.readonly</code> — the most restricted scope that lets us read messages.</li>
          <li>The refresh token is encrypted at rest with AES-128 (Fernet). Access tokens live in memory only.</li>
          <li>You can disconnect any time in Settings — it both removes the token here and revokes the grant on Google's side.</li>
          <li>Your account email <strong>{user?.email}</strong> must match the Gmail you connect, so no one else's mailbox can be linked.</li>
        </ul>
      </section>

      {/* Step-by-step */}
      <section className="rounded-xl p-5 mb-5" style={card}>
        <h2 className="text-base font-semibold m-0 mb-3" style={{ color: 'var(--text-primary)' }}>
          What happens next
        </h2>
        <ol className="text-sm space-y-2 m-0 pl-4" style={{ color: 'var(--text-secondary)' }}>
          <li>You'll be sent to Google to confirm.</li>
          <li>Google shows you exactly what permission we're asking for (read-only Gmail).</li>
          <li>You approve, and Google sends you back here.</li>
          <li>We immediately scan for EasyEquities trade emails and build your portfolio.</li>
          <li>From then on, new trades flow in automatically.</li>
        </ol>
      </section>

      {error && (
        <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: '#FEF2F2' }}>
          <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      <button
        onClick={handleConnect}
        disabled={connecting || (!loading && status.connected)}
        className="w-full py-3 rounded-lg font-semibold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
        style={btnPrimary}
      >
        <Mail size={16} />
        {connecting ? 'Redirecting to Google…' : status.connected ? 'Already connected' : 'Continue to Google'}
      </button>

      <p className="text-xs text-center mt-4" style={{ color: 'var(--text-muted)' }}>
        Not ready? You can come back to this from Settings any time.
      </p>
    </div>
  );
}

const codeStyle = {
  backgroundColor: 'var(--bg-page)',
  border: '1px solid var(--border)',
  borderRadius: 4,
  padding: '1px 6px',
  fontSize: 12,
};

function PrivacyItem({ icon: Icon, children, positive = false }) {
  const color = positive ? 'var(--success)' : 'var(--danger)';
  const bg = positive ? '#ECFDF5' : '#FEF2F2';
  return (
    <li className="flex gap-3 items-start text-sm" style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
      <span
        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: bg, color }}
      >
        <Icon size={12} />
      </span>
      <span>{children}</span>
    </li>
  );
}
