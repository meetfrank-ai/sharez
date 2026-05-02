import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Trophy, Clock, Users, ChevronRight } from 'lucide-react';
import api from '../utils/api';

/**
 * Challenge landing page — explainer + countdown / live leaderboard
 * + (if invited) join CTA + (if participant + pre-lockup) submit picks CTA.
 */
export default function Challenge() {
  const { slug } = useParams();
  const [c, setC] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    let cancelled = false;
    api.get(`/challenges/${slug}`)
      .then(({ data }) => { if (!cancelled) setC(data); })
      .catch(err => { if (!cancelled) setError(err.response?.data?.detail || 'Could not load challenge'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  // 1s tick for the countdown
  useEffect(() => {
    if (!c?.lockup_at) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [c?.lockup_at]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB' }} /></div>;
  if (error) return <div className="max-w-2xl mx-auto px-4 py-6 text-sm" style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!c) return null;

  const lockupMs = c.lockup_at ? new Date(c.lockup_at).getTime() - now : null;
  const lockupPassed = lockupMs != null && lockupMs <= 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="rounded-xl p-6 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Trophy size={20} style={{ color: 'var(--accent)' }} />
          <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: 'var(--accent)' }}>
            {lockupPassed ? 'Live · year-long contest' : 'Picks open · invite-only'}
          </span>
        </div>
        <h1 className="text-2xl font-semibold m-0 mb-2" style={{ color: 'var(--text-primary)' }}>
          {c.name}
        </h1>
        {c.description && (
          <p className="text-sm leading-relaxed m-0 mb-4" style={{ color: 'var(--text-secondary)' }}>
            {c.description}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3 mb-4">
          <Stat icon={Users} label="Participants" value={`${c.participant_count} / ${c.max_participants}`} />
          <Stat icon={Trophy} label="Picks" value={`${c.pick_count} stocks`} />
          <Stat icon={Clock} label={lockupPassed ? 'Status' : 'Lockup'} value={lockupPassed ? 'Locked' : countdown(lockupMs)} />
        </div>

        {/* CTA row — depends on viewer state */}
        {c.is_participant ? (
          <div className="flex flex-wrap gap-2">
            {!c.my_picks_locked && !lockupPassed && (
              <Link to={`/challenges/${slug}/picks`}
                className="px-4 py-2.5 rounded-lg text-sm font-semibold no-underline"
                style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                Submit your 5 picks
              </Link>
            )}
            <Link to={`/challenges/${slug}/leaderboard`}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold no-underline border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Leaderboard →
            </Link>
          </div>
        ) : !lockupPassed ? (
          <div className="flex flex-wrap gap-2">
            <Link to={`/challenges/${slug}/join`}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold no-underline"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
              I have an invite code
            </Link>
            <Link to={`/challenges/${slug}/leaderboard`}
              className="px-4 py-2.5 rounded-lg text-sm font-semibold no-underline border"
              style={{ borderColor: 'var(--border)', color: 'var(--text-primary)' }}>
              Watch the leaderboard →
            </Link>
          </div>
        ) : (
          <Link to={`/challenges/${slug}/leaderboard`}
            className="inline-block px-4 py-2.5 rounded-lg text-sm font-semibold no-underline"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            View live leaderboard →
          </Link>
        )}
      </div>

      {/* How it works */}
      <section className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <h2 className="text-base font-semibold m-0 mb-3" style={{ color: 'var(--text-primary)' }}>
          How it works
        </h2>
        <ol className="text-sm space-y-2 m-0 pl-4" style={{ color: 'var(--text-secondary)' }}>
          <li><strong>500 invited participants</strong> pick {c.pick_count} {c.market} stocks before lockup.</li>
          <li>Each pick comes with a <strong>locked thesis</strong> explaining why — these don't change.</li>
          <li>Performance is <strong>equal-weighted</strong>, computed daily from market prices.</li>
          <li>Anyone with a Sharez account can read picks, comment, and follow participants.</li>
          <li>Every quarter, participants add an update to each thesis. Originals stay frozen.</li>
        </ol>
      </section>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-semibold tracking-wider uppercase mb-1" style={{ color: 'var(--text-muted)' }}>
        <Icon size={10} /> {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}

function countdown(ms) {
  if (ms == null) return '—';
  if (ms <= 0) return 'Locked';
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
