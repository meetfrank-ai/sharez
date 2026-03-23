import { Link } from 'react-router-dom';
import { FileText } from 'lucide-react';
import TierBadge from './TierBadge';

export default function ThesisCard({ thesis }) {
  const time = new Date(thesis.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className="rounded-xl p-5 mb-4 transition-all hover:shadow-md"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-3">
        <Link to={`/user/${thesis.user_id}`} className="no-underline shrink-0" onClick={(e) => e.stopPropagation()}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {thesis.display_name?.charAt(0).toUpperCase()}
          </div>
        </Link>
        <div className="flex-1 min-w-0">
          <Link to={`/user/${thesis.user_id}`} className="text-sm font-semibold no-underline hover:underline" style={{ color: 'var(--text-primary)' }}>
            {thesis.display_name}
          </Link>
          {thesis.handle && (
            <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>@{thesis.handle}</span>
          )}
          <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>· {time}</span>
        </div>
        <TierBadge tier={thesis.visibility} />
      </div>

      {/* Stock tag */}
      {thesis.stock_name && (
        <Link
          to={`/stock/${thesis.contract_code || thesis.stock_tag}?name=${encodeURIComponent(thesis.stock_name)}`}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium no-underline mb-3"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
        >
          <FileText size={12} />
          {thesis.stock_name}
        </Link>
      )}

      {/* Body */}
      <p className="text-sm leading-relaxed whitespace-pre-line m-0" style={{ color: 'var(--text-primary)' }}>
        {thesis.body}
      </p>
    </div>
  );
}
