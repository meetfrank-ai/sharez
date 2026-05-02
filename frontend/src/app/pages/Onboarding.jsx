import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { BarChart3, Lock, MessageSquare } from 'lucide-react';
import api from '../utils/api';

const INTRO_SLIDES = [
  {
    Icon: BarChart3,
    title: 'See what your friends invest in',
    body: 'Real, verified portfolios — not screenshots. See what people you trust are actually holding, buying, and selling.',
  },
  {
    Icon: Lock,
    title: 'You control what others see',
    body: 'Share as much or as little as you want. Followers see percentages, not Rand amounts. You decide who gets deeper access.',
  },
  {
    Icon: MessageSquare,
    title: 'AI-powered stock insights',
    body: 'Every stock has an AI summary, community sentiment, and notes from investors you follow.',
  },
];

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const { setUser, user } = useAuth();
  const navigate = useNavigate();

  const finish = async () => {
    try {
      await api.post('/auth/complete-onboarding');
      setUser({ ...user, has_onboarded: true });
    } catch {}
    navigate('/app');
  };

  const btnPrimary = {
    backgroundColor: 'var(--accent)',
    color: '#FFFFFF',
    border: 'none',
    cursor: 'pointer',
  };

  const slide = INTRO_SLIDES[step];
  const SlideIcon = slide.Icon;
  const isLast = step === INTRO_SLIDES.length - 1;

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
            onClick={isLast ? finish : () => setStep(step + 1)}
            className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90"
            style={btnPrimary}
          >
            {isLast ? 'Get Started' : 'Next'}
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
