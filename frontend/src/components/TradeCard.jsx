import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, Shield } from 'lucide-react';

const AVATAR_COLORS = ['#7F77DD', '#D85A30', '#1D9E75', '#378ADD', '#D4537E', '#639922', '#BA7517', '#534AB7'];
const getColor = (id) => AVATAR_COLORS[(String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0)) % AVATAR_COLORS.length];

export default function TradeCard({ trade }) {
  const isBuy = trade.event_type === 'buy' || trade.action === 'buy';
  const isVerified = trade.metadata?.is_verified;
  const tradeDate = trade.metadata?.trade_date;
  const ticker = trade.metadata?.ticker || trade.stock_tag;
  const market = trade.metadata?.market || 'JSE';

  const time = new Date(trade.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="rounded-xl mb-4 overflow-hidden" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      {/* Header */}
      <div className="flex items-center gap-2.5 px-5 pt-5 pb-3">
        <Link to={`/user/${trade.user_id}`} className="no-underline shrink-0">
          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: getColor(trade.user_id) }}>
            {trade.display_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/user/${trade.user_id}`} className="text-sm font-semibold no-underline hover:underline" style={{ color: 'var(--text-primary)' }}>
            {trade.display_name}
          </Link>
          {trade.handle && (
            <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>@{trade.handle}</span>
          )}
          <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>· {time}</span>
        </div>
      </div>

      {/* Trade card */}
      <div className="mx-5 mb-3 rounded-lg p-3.5" style={{
        backgroundColor: isBuy ? '#F0FDF4' : '#FEF2F2',
        border: `1px solid ${isBuy ? '#BBF7D0' : '#FECACA'}`,
      }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            {isBuy
              ? <TrendingUp size={15} style={{ color: '#16A34A' }} />
              : <TrendingDown size={15} style={{ color: '#DC2626' }} />
            }
            <span className="text-xs font-semibold" style={{ color: isBuy ? '#16A34A' : '#DC2626' }}>
              {isBuy ? 'Bought' : 'Sold'}
            </span>
          </div>
          {isVerified && (
            <span className="flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: '#D1FAE5', color: '#15803D' }}>
              <Shield size={9} /> EE verified
            </span>
          )}
        </div>
        <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
          {trade.stock_name}
        </p>
        <p className="text-xs m-0 mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {ticker && `${ticker}.${market}`}{tradeDate && ` · ${tradeDate}`}
        </p>
      </div>

      {/* Note body */}
      {trade.body && (
        <p className="text-sm leading-relaxed px-5 mb-3 m-0" style={{ color: 'var(--text-primary)' }}>
          {trade.body}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center gap-4 px-5 py-3" style={{ borderTop: '1px solid var(--border)' }}>
        {trade.stock_name && (
          <Link to={`/stock/${ticker || trade.stock_tag}?name=${encodeURIComponent(trade.stock_name)}`}
            className="text-xs font-medium no-underline" style={{ color: 'var(--accent)' }}>
            View stock →
          </Link>
        )}
      </div>
    </div>
  );
}
