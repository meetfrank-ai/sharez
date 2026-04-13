import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BarChart3, Lock, MessageSquare, Shield } from 'lucide-react';
import api from '../utils/api';

const INTRO_SLIDES = [
  {
    Icon: BarChart3,
    title: 'See what your friends invest in',
    body: 'Real, verified portfolios from EasyEquities — not screenshots. See what people you trust are actually holding, buying, and selling.',
  },
  {
    Icon: Lock,
    title: 'You control what others see',
    body: 'Share as much or as little as you want. Followers see percentages, not Rand amounts. You decide who gets deeper access.',
  },
  {
    Icon: MessageSquare,
    title: 'AI-powered stock insights',
    body: 'Every stock has an AI summary, community sentiment, and notes from investors you follow. See why people are investing and what the risks are.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const [eeUsername, setEeUsername] = useState('');
  const [eePassword, setEePassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState('');
  const [connectSuccess, setConnectSuccess] = useState(false);
  const { setUser, user } = useAuth();
  const navigate = useNavigate();

  const finishOnboarding = async () => {
    try {
      await api.post('/auth/complete-onboarding');
      setUser({ ...user, has_onboarded: true });
    } catch {}
    navigate('/app');
  };

  const handleConnectEE = async (e) => {
    e.preventDefault();
    setConnecting(true);
    setConnectError('');
    try {
      await api.post('/portfolio/connect-ee', {
        ee_username: eeUsername,
        ee_password: eePassword,
      });
      setConnectSuccess(true);
    } catch (err) {
      setConnectError(err.response?.data?.detail || 'Connection failed. You can try again later in Settings.');
    } finally {
      setConnecting(false);
    }
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

  // --- Intro slides (steps 0–2) ---
  if (step < 3) {
    const slide = INTRO_SLIDES[step];
    const SlideIcon = slide.Icon;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="w-full max-w-sm text-center">
          <div className="flex justify-center gap-2 mb-10">
            {INTRO_SLIDES.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  backgroundColor: i === step ? 'var(--accent)' : 'var(--border)',
                  width: i === step ? '24px' : '8px',
                }}
              />
            ))}
          </div>

          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            <SlideIcon size={28} />
          </div>

          <h1 className="text-xl font-semibold mb-3 m-0" style={{ color: 'var(--text-primary)' }}>
            {slide.title}
          </h1>
          <p className="text-sm leading-relaxed mb-10" style={{ color: 'var(--text-secondary)' }}>
            {slide.body}
          </p>

          <div className="space-y-3">
            <button
              onClick={() => setStep(step + 1)}
              className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
              style={btnPrimary}
            >
              {step === 2 ? 'Get Started' : 'Next'}
            </button>
            {step > 0 && (
              <button
                onClick={() => setStep(step - 1)}
                className="w-full py-2.5 rounded-lg text-sm font-medium bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Step 4: Skip explanation ---
  if (step === 4) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-page)' }}>
        <div className="w-full max-w-sm text-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ backgroundColor: '#FEF3C7', color: '#D97706' }}
          >
            <Shield size={28} />
          </div>
          <h1 className="text-xl font-semibold mb-3 m-0" style={{ color: 'var(--text-primary)' }}>
            No problem — connect later
          </h1>
          <p className="text-sm leading-relaxed mb-5" style={{ color: 'var(--text-secondary)' }}>
            Without EasyEquities connected, your profile won't show portfolio holdings.
          </p>

          <div
            className="rounded-xl p-5 mb-6 text-left"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
          >
            <p className="text-xs font-semibold mb-2 m-0" style={{ color: 'var(--success)' }}>
              What you can still do:
            </p>
            <ul className="text-xs space-y-1 m-0 pl-4" style={{ color: 'var(--text-secondary)' }}>
              <li>Post notes and investment theses</li>
              <li>Follow other investors</li>
              <li>Comment and engage</li>
              <li>Read AI stock summaries</li>
            </ul>
            <p className="text-xs font-semibold mt-3 mb-2 m-0" style={{ color: 'var(--text-muted)' }}>
              What you'll be missing:
            </p>
            <ul className="text-xs space-y-1 m-0 pl-4" style={{ color: 'var(--text-muted)' }}>
              <li>Showcasing your portfolio and P&L</li>
              <li>Auto-detected buy/sell activity</li>
              <li>Monetising insights via Vault</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button onClick={finishOnboarding} className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90" style={btnPrimary}>
              Continue without connecting
            </button>
            <button onClick={() => setStep(3)} className="w-full py-2.5 rounded-lg text-sm font-medium bg-transparent border-none cursor-pointer" style={{ color: 'var(--accent)' }}>
              Go back and connect
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Step 3: EE Connection ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ backgroundColor: 'var(--bg-page)' }}>
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            <BarChart3 size={28} />
          </div>
          <h1 className="text-xl font-semibold mb-2 m-0" style={{ color: 'var(--text-primary)' }}>
            Connect EasyEquities
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            Link your account to sync your portfolio. Nothing is shared without your permission.
          </p>
        </div>

        <div
          className="rounded-xl p-4 mb-5 flex gap-3"
          style={{ backgroundColor: 'var(--accent-light)', border: '1px solid #C7D2FE' }}
        >
          <Shield size={18} className="shrink-0 mt-0.5" style={{ color: 'var(--accent)' }} />
          <div>
            <p className="text-xs font-semibold mb-1 m-0" style={{ color: 'var(--accent)' }}>
              Your data stays private by default
            </p>
            <p className="text-xs leading-relaxed m-0" style={{ color: 'var(--text-secondary)' }}>
              Credentials are encrypted. Portfolio visibility is controlled by the tiers you configure.
            </p>
          </div>
        </div>

        {connectSuccess ? (
          <div className="text-center">
            <div
              className="rounded-xl p-5 mb-5"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}
            >
              <div className="text-2xl mb-2">✓</div>
              <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Portfolio synced!</p>
              <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
                Your holdings have been imported. Manage visibility in Settings.
              </p>
            </div>
            <button onClick={finishOnboarding} className="w-full py-2.5 rounded-lg font-semibold text-sm" style={btnPrimary}>
              Let's go
            </button>
          </div>
        ) : (
          <>
            <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
              <form onSubmit={handleConnectEE} className="space-y-3">
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>EasyEquities username</label>
                  <input type="text" placeholder="Your EE login" value={eeUsername} onChange={(e) => setEeUsername(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
                </div>
                <div>
                  <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>EasyEquities password</label>
                  <input type="password" placeholder="Your EE password" value={eePassword} onChange={(e) => setEePassword(e.target.value)} required className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
                </div>
                {connectError && (
                  <div className="rounded-lg px-3 py-2" style={{ backgroundColor: '#FEF2F2' }}>
                    <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{connectError}</p>
                  </div>
                )}
                <button type="submit" disabled={connecting} className="w-full py-2.5 rounded-lg font-semibold text-sm disabled:opacity-50" style={btnPrimary}>
                  {connecting ? 'Connecting...' : 'Connect & Sync'}
                </button>
              </form>
            </div>
            <button onClick={() => setStep(4)} className="w-full py-2.5 rounded-lg text-sm font-medium bg-transparent border-none cursor-pointer" style={{ color: 'var(--text-muted)' }}>
              Skip for now
            </button>
          </>
        )}
      </div>
    </div>
  );
}
