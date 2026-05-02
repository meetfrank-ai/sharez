import { useEffect, useMemo, useState } from 'react';
import api from '../utils/api';

/**
 * Cumulative portfolio % return chart (D-14). Renders the track-record
 * surface on profiles. Pure SVG — no chart lib. % only, never rand,
 * unless the viewer is the owner.
 *
 * Props:
 *   userId   profile being viewed
 *   days     window (default 365). Range pills toggle 30 / 90 / 365 / all.
 *   isOwner  whether to surface the rand fields the API exposes for self
 */

const RANGES = [
  { key: 30, label: '30d' },
  { key: 90, label: '3m' },
  { key: 365, label: '1y' },
  { key: 3650, label: 'All' },
];

export default function PortfolioChart({ userId, defaultDays = 365, isOwner = false }) {
  const [days, setDays] = useState(defaultDays);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    api.get(`/portfolio/history/${userId}`, { params: { days } })
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [userId, days]);

  const chart = useMemo(() => {
    if (!data?.points?.length) return null;
    const pts = data.points.filter(p => p.return_pct != null);
    if (pts.length < 2) return null;

    const W = 600;
    const H = 180;
    const padX = 8;
    const padY = 16;

    const values = pts.map(p => p.return_pct);
    const min = Math.min(0, Math.min(...values));
    const max = Math.max(0, Math.max(...values));
    const range = max - min || 1;
    const stepX = (W - padX * 2) / (pts.length - 1);

    const yFor = (v) => H - padY - ((v - min) / range) * (H - padY * 2);

    const path = pts.map((p, i) => {
      const x = padX + i * stepX;
      const y = yFor(p.return_pct);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');

    const areaPath = `${path} L${(padX + (pts.length - 1) * stepX).toFixed(2)},${yFor(min).toFixed(2)} L${padX},${yFor(min).toFixed(2)} Z`;
    const baselineY = yFor(0);

    return { W, H, path, areaPath, baselineY, min, max, last: values[values.length - 1] };
  }, [data]);

  const last = chart?.last;
  const positive = (last ?? 0) >= 0;
  const stroke = positive ? '#16A34A' : '#DC2626';
  const fill = positive ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)';

  return (
    <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
          Track record
        </h3>
        <div className="flex gap-1">
          {RANGES.map(r => {
            const active = days === r.key;
            return (
              <button
                key={r.key}
                onClick={() => setDays(r.key)}
                className="text-[11px] font-medium px-2 py-1 rounded-md border-none cursor-pointer"
                style={{
                  backgroundColor: active ? 'var(--accent-light)' : 'transparent',
                  color: active ? 'var(--accent)' : 'var(--text-muted)',
                }}
              >
                {r.label}
              </button>
            );
          })}
        </div>
      </div>

      <p className="text-xs m-0 mb-3" style={{ color: 'var(--text-muted)' }}>
        Cumulative % return — never rand-denominated.
      </p>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-xs" style={{ color: 'var(--text-muted)' }}>Loading…</div>
      ) : !chart ? (
        <div className="flex items-center justify-center h-32 text-xs text-center" style={{ color: 'var(--text-muted)' }}>
          {data?.points?.length === 0
            ? 'Connect Gmail to backfill your track record from imported trades.'
            : 'Not enough price data yet — chart fills in as the daily cron runs.'}
        </div>
      ) : (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-semibold" style={{ color: stroke, fontVariantNumeric: 'tabular-nums' }}>
              {positive ? '+' : ''}{last.toFixed(2)}%
            </span>
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              over {data.first_date} → {data.last_date}
            </span>
          </div>
          <svg width="100%" height={chart.H} viewBox={`0 0 ${chart.W} ${chart.H}`} preserveAspectRatio="none" style={{ display: 'block' }}>
            {/* 0% baseline */}
            <line x1="0" x2={chart.W} y1={chart.baselineY} y2={chart.baselineY}
              stroke="var(--border)" strokeWidth="1" strokeDasharray="3,3" />
            <path d={chart.areaPath} fill={fill} stroke="none" />
            <path d={chart.path} fill="none" stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          {/* Owner-only rand peek */}
          {isOwner && data?.points?.length > 0 && data.points[data.points.length - 1].total_value != null && (
            <p className="text-[11px] m-0 mt-2" style={{ color: 'var(--text-muted)' }}>
              You only · current value R{Number(data.points[data.points.length - 1].total_value).toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
            </p>
          )}
        </>
      )}
    </div>
  );
}
