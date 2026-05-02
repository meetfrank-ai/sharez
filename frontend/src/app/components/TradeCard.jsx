import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, MoreHorizontal } from 'lucide-react';
import Sparkline from './Sparkline';

const AVATAR_COLORS = ['#7F77DD', '#D85A30', '#1D9E75', '#378ADD', '#D4537E', '#639922', '#BA7517', '#534AB7'];
const getColor = (id) =>
  AVATAR_COLORS[String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];

function formatRelativeTime(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  const now = new Date();
  const diffMin = Math.round((now - date) / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return 'yesterday';
  if (diffD < 7) return `${diffD}d ago`;
  return date.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' });
}

function formatNumber(n, decimals = 2) {
  if (n == null || isNaN(n)) return '—';
  return Number(n).toLocaleString('en-ZA', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

/**
 * Trade card matching the Sirius pattern:
 *   row 1: avatar · name · @handle · relative time · broker · account
 *   row 2: action verb (Bought/Sold) + ticker + position-state pill
 *   row 3: SHARES / PRICE / VALUE 3-column block + sparkline
 *   row 4: Bull / Bear / Comment footer (Phase 2 wires reactions)
 */
export default function TradeCard({ trade }) {
  const meta = trade.metadata || {};
  const isBuy = trade.event_type === 'buy' || trade.action === 'buy' || trade.event_type === 'added_stock';
  const isOpening = !!meta.is_opening_position;

  const ticker = meta.ticker || trade.stock_tag || '';
  const market = meta.market || '';
  const broker = meta.broker_name || 'EasyEquities';
  const account = meta.account_type;
  const eodhdSymbol = meta.eodhd_symbol || (ticker && market ? `${ticker}.${market}` : null);

  const shares = meta.shares;
  const price = meta.price;
  const value =
    meta.value ?? (shares != null && price != null ? shares * price : null);

  const time = formatRelativeTime(trade.created_at);

  const accent = isBuy ? '#16A34A' : '#DC2626';
  const accentBg = isBuy ? '#F0FDF4' : '#FEF2F2';
  const accentBorder = isBuy ? '#BBF7D0' : '#FECACA';

  return (
    <div
      className="rounded-xl mb-4 overflow-hidden"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
    >
      {/* Header */}
      <div className="flex items-start gap-2.5 px-5 pt-5 pb-3">
        <Link to={`/user/${trade.user_id}`} className="no-underline shrink-0">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: getColor(trade.user_id) }}
          >
            {trade.display_name?.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
            <Link
              to={`/user/${trade.user_id}`}
              className="text-sm font-semibold no-underline hover:underline truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {trade.display_name}
            </Link>
            {trade.handle && (
              <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                @{trade.handle}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-xs mt-0.5 flex-wrap" style={{ color: 'var(--text-muted)' }}>
            <span>{time}</span>
            <span>·</span>
            <span>{broker}{account ? ` ${account}` : ''}</span>
          </div>
        </div>
        <button
          aria-label="More"
          className="bg-transparent border-none cursor-pointer p-1 rounded-md"
          style={{ color: 'var(--text-muted)' }}
        >
          <MoreHorizontal size={16} />
        </button>
      </div>

      {/* Action + ticker */}
      <div className="flex items-center gap-2 px-5 mb-2 flex-wrap">
        <span className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: accent }}>
          {isBuy ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
          {isBuy ? 'Bought' : 'Sold'}
        </span>
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {ticker || trade.stock_name}
        </span>
        {trade.stock_name && ticker && (
          <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
            · {trade.stock_name}
          </span>
        )}
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full ml-auto"
          style={{
            backgroundColor: isOpening ? '#DBEAFE' : accentBg,
            color: isOpening ? '#1D4ED8' : accent,
            border: `1px solid ${isOpening ? '#BFDBFE' : accentBorder}`,
          }}
        >
          {isOpening ? 'Opening Position' : 'Adding to Position'}
        </span>
      </div>

      {/* Numbers + sparkline */}
      <div className="px-5 pb-3 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
        <div className="grid grid-cols-3 gap-3">
          <Stat label="SHARES" value={shares != null ? formatNumber(shares, shares % 1 === 0 ? 0 : 4) : '—'} />
          <Stat label="PRICE" value={price != null ? `R${formatNumber(price, 2)}` : '—'} />
          <Stat label="VALUE" value={value != null ? `R${formatNumber(value, 2)}` : '—'} />
        </div>
        {eodhdSymbol && (
          <div className="md:justify-self-end">
            <Sparkline symbol={eodhdSymbol} days={30} width={200} height={48} />
          </div>
        )}
      </div>

      {/* Optional note body */}
      {trade.body && (
        <p className="text-sm leading-relaxed px-5 pb-3 m-0" style={{ color: 'var(--text-primary)' }}>
          {trade.body}
        </p>
      )}

      {/* Footer — reactions placeholder; wired in P2.2 */}
      <div className="flex items-center gap-1 px-5 py-2.5" style={{ borderTop: '1px solid var(--border)' }}>
        <FooterButton icon={TrendingUp} label="Bull" disabled />
        <FooterButton icon={TrendingDown} label="Bear" disabled />
        <Link
          to={`/stock/${ticker || trade.stock_tag || ''}?name=${encodeURIComponent(trade.stock_name || '')}`}
          className="ml-auto text-xs font-medium no-underline px-3 py-1.5 rounded-md"
          style={{ color: 'var(--accent)' }}
        >
          View stock →
        </Link>
      </div>
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] font-semibold tracking-wider mb-0.5" style={{ color: 'var(--text-muted)' }}>
        {label}
      </div>
      <div className="text-sm font-semibold" style={{ color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </div>
    </div>
  );
}

function FooterButton({ icon: Icon, label, count, disabled }) {
  return (
    <button
      disabled={disabled}
      className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md bg-transparent border-none cursor-pointer disabled:opacity-50"
      style={{ color: 'var(--text-muted)' }}
    >
      <Icon size={14} />
      <span>{label}</span>
      {count != null && count > 0 && <span>· {count}</span>}
    </button>
  );
}
