import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ChevronDown, ChevronUp, X } from 'lucide-react';
import api from '../utils/api';

/**
 * Activation checklist that sits at the top of the Feed for new users.
 * Mirrors Sirius's "Get started — N/5 completed" card. Auto-hides once
 * all steps are complete or the user dismisses it.
 *
 * Steps come from the backend (/api/auth/onboarding) so progress is
 * derived from real actions, not local state.
 */
export default function OnboardingChecklist() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(true);
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem('sharez_onboarding_dismissed') === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    api.get('/auth/onboarding')
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [dismissed]);

  if (dismissed || !data) return null;
  if (data.all_done) return null;

  const pct = Math.round((data.completed_count / data.total) * 100);

  return (
    <div
      className="rounded-xl mb-4 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-5 py-4">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
            Get started
          </p>
          <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
            {data.completed_count}/{data.total} completed
          </p>
        </div>
        <button
          aria-label="Dismiss"
          onClick={() => {
            setDismissed(true);
            try { localStorage.setItem('sharez_onboarding_dismissed', '1'); } catch {}
          }}
          className="p-1 rounded-md bg-transparent border-none cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          <X size={16} />
        </button>
        <button
          aria-label={open ? 'Collapse' : 'Expand'}
          onClick={() => setOpen(!open)}
          className="p-1 rounded-md bg-transparent border-none cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 mx-5 mb-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--border)' }}>
        <div
          className="h-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: 'var(--accent)' }}
        />
      </div>

      {/* Steps */}
      {open && (
        <ul className="m-0 pl-0 list-none pb-2">
          {data.steps.map((s) => (
            <li key={s.key} className="flex items-start gap-3 px-5 py-2.5">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{
                  backgroundColor: s.completed ? '#ECFDF5' : 'transparent',
                  border: `1px solid ${s.completed ? '#A7F3D0' : 'var(--border)'}`,
                  color: s.completed ? 'var(--success)' : 'transparent',
                }}
              >
                {s.completed && <Check size={11} strokeWidth={3} />}
              </span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium m-0"
                  style={{
                    color: 'var(--text-primary)',
                    textDecoration: s.completed ? 'line-through' : 'none',
                    opacity: s.completed ? 0.55 : 1,
                  }}
                >
                  {s.title}
                </p>
                {!s.completed && (
                  <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {s.blurb}
                  </p>
                )}
              </div>
              {!s.completed && (
                <Link
                  to={s.href}
                  className="text-xs font-semibold no-underline px-3 py-1.5 rounded-md shrink-0"
                  style={{ color: 'var(--accent)', backgroundColor: 'var(--accent-light)' }}
                >
                  {s.cta}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
