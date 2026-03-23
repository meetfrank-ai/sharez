import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, FileText, MessageCircle, PenLine, UserPlus } from 'lucide-react';

const eventConfig = {
  added_stock: { verb: 'bought', Icon: TrendingUp, color: 'var(--success)' },
  removed_stock: { verb: 'sold', Icon: TrendingDown, color: 'var(--danger)' },
  new_thesis: { verb: 'posted a thesis on', Icon: FileText, color: 'var(--accent)' },
  new_comment: { verb: 'commented on', Icon: MessageCircle, color: 'var(--text-muted)' },
  new_note: { verb: 'posted a note', Icon: PenLine, color: 'var(--accent)' },
  new_follow: { verb: 'started following', Icon: UserPlus, color: 'var(--tier-inner)' },
};

export default function FeedItem({ event }) {
  const config = eventConfig[event.event_type] || { verb: event.event_type, Icon: FileText, color: 'var(--text-muted)' };
  const { Icon } = config;
  const stockName = event.metadata?.stock_name;
  const followingName = event.metadata?.following_name;
  const contractCode = event.metadata?.contract_code;

  const time = new Date(event.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const content = (
    <div
      className="rounded-xl p-4 mb-3 transition-all hover:shadow-md"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          {event.display_name?.charAt(0).toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm m-0 leading-snug">
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {event.display_name || 'Someone'}
            </span>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{config.verb}</span>{' '}
            {stockName && (
              <span className="font-semibold" style={{ color: config.color }}>
                {stockName}
              </span>
            )}
            {followingName && (
              <span className="font-semibold" style={{ color: config.color }}>
                {followingName}
              </span>
            )}
          </p>
          <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>
            {time}
          </p>
        </div>

        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${config.color}15` }}
        >
          <Icon size={14} style={{ color: config.color }} />
        </div>
      </div>
    </div>
  );

  if (contractCode) {
    return (
      <Link to={`/stock/${contractCode}?name=${encodeURIComponent(stockName || '')}`} className="block no-underline">
        {content}
      </Link>
    );
  }

  return content;
}
