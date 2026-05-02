import { useEffect, useState, useMemo } from 'react';
import api from '../utils/api';

/**
 * Pure-SVG sparkline. No chart library — keeps bundle small and
 * matches the simple, non-interactive line chart in Sirius's trade cards.
 *
 * Props:
 *   symbol  EODHD-style symbol e.g. "PRX.JSE", "AAPL.US"
 *   days    lookback window (default 30)
 *   width   px (default 220)
 *   height  px (default 56)
 *   accent  override stroke colour; default = green if up, red if down
 */
export default function Sparkline({ symbol, days = 30, width = 220, height = 56, accent }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!symbol) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    api.get(`/stocks/${encodeURIComponent(symbol)}/sparkline`, { params: { days } })
      .then(({ data }) => { if (!cancelled) setData(data); })
      .catch(() => { if (!cancelled) setData(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, days]);

  const path = useMemo(() => {
    if (!data?.points?.length) return null;
    const closes = data.points.map((p) => p.close);
    const min = Math.min(...closes);
    const max = Math.max(...closes);
    const range = max - min || 1;
    const stepX = width / Math.max(1, closes.length - 1);
    const points = closes.map((c, i) => {
      const x = i * stepX;
      const y = height - ((c - min) / range) * height;
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    });
    return points.join(' ');
  }, [data, width, height]);

  if (loading) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
        …
      </div>
    );
  }

  if (!data || !data.points || data.points.length < 2) {
    return (
      <div style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 11 }}>
        no chart
      </div>
    );
  }

  const isUp = (data.change_pct ?? 0) >= 0;
  const stroke = accent || (isUp ? '#10B981' : '#EF4444');
  const fill = isUp ? 'rgba(16,185,129,0.10)' : 'rgba(239,68,68,0.10)';

  // Build a closed area for the soft fill underneath the line.
  const areaPath = path
    ? `${path} L${width.toFixed(2)},${height.toFixed(2)} L0,${height.toFixed(2)} Z`
    : '';

  return (
    <div style={{ width, position: 'relative' }}>
      <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        {areaPath && <path d={areaPath} fill={fill} stroke="none" />}
        {path && <path d={path} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: 'var(--text-muted)' }}>
        <span>R{Number(data.last).toFixed(2)}</span>
        <span style={{ color: stroke, fontWeight: 600 }}>
          {isUp ? '+' : ''}{data.change_pct ?? 0}%
        </span>
      </div>
    </div>
  );
}
