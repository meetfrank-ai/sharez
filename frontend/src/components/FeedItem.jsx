import { useState } from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, TrendingDown, FileText, MessageCircle, PenLine, UserPlus, Send } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import api from '../utils/api';

const eventConfig = {
  added_stock: { verb: 'bought', Icon: TrendingUp, color: 'var(--success)' },
  removed_stock: { verb: 'sold', Icon: TrendingDown, color: 'var(--danger)' },
  new_thesis: { verb: 'posted a thesis on', Icon: FileText, color: 'var(--accent)' },
  new_comment: { verb: 'commented on', Icon: MessageCircle, color: 'var(--text-muted)' },
  new_note: { verb: 'posted a note', Icon: PenLine, color: 'var(--accent)' },
  new_follow: { verb: 'started following', Icon: UserPlus, color: 'var(--tier-inner)' },
};

export default function FeedItem({ event }) {
  const { user } = useAuth();
  const config = eventConfig[event.event_type] || { verb: event.event_type, Icon: FileText, color: 'var(--text-muted)' };
  const { Icon } = config;
  const stockName = event.metadata?.stock_name || event.stock_name;
  const followingName = event.metadata?.following_name;
  const contractCode = event.metadata?.contract_code || event.stock_tag;

  const isOwnTransaction = event.user_id === user?.id;
  const isTransaction = event.event_type === 'added_stock' || event.event_type === 'removed_stock';

  const [showComposer, setShowComposer] = useState(false);
  const [noteBody, setNoteBody] = useState('');
  const [posting, setPosting] = useState(false);

  const time = new Date(event.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePostNote = async () => {
    if (!noteBody.trim() || posting) return;
    setPosting(true);
    try {
      await api.post('/notes/', {
        body: noteBody.trim(),
        visibility: 'public',
        stock_tag: contractCode,
        stock_name: stockName,
      });
      setNoteBody('');
      setShowComposer(false);
    } catch {
      alert('Failed to post note');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 mb-3 transition-all hover:shadow-md"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <div className="flex items-start gap-3">
        <Link to={`/user/${event.user_id}`} className="no-underline shrink-0" onClick={(e) => e.stopPropagation()}>
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold cursor-pointer hover:opacity-80 transition-opacity"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {event.display_name?.charAt(0).toUpperCase() || '?'}
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          <p className="text-sm m-0 leading-snug">
            <Link
              to={`/user/${event.user_id}`}
              className="font-semibold no-underline hover:underline"
              style={{ color: 'var(--text-primary)' }}
              onClick={(e) => e.stopPropagation()}
            >
              {event.display_name || 'Someone'}
            </Link>{' '}
            <span style={{ color: 'var(--text-secondary)' }}>{config.verb}</span>{' '}
            {stockName && contractCode && (
              <Link
                to={`/stock/${contractCode}?name=${encodeURIComponent(stockName)}`}
                className="font-semibold no-underline hover:underline"
                style={{ color: config.color }}
                onClick={(e) => e.stopPropagation()}
              >
                {stockName}
              </Link>
            )}
            {stockName && !contractCode && (
              <span className="font-semibold" style={{ color: config.color }}>{stockName}</span>
            )}
            {followingName && (
              <span className="font-semibold" style={{ color: config.color }}>{followingName}</span>
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

      {/* Add note button — only on own transactions */}
      {isOwnTransaction && isTransaction && !showComposer && (
        <button
          onClick={() => setShowComposer(true)}
          className="flex items-center gap-1 mt-3 px-0 text-xs bg-transparent border-none cursor-pointer"
          style={{ color: 'var(--accent)' }}
        >
          <PenLine size={12} /> Add a note about this {event.event_type === 'added_stock' ? 'buy' : 'sell'}
        </button>
      )}

      {/* Inline note composer */}
      {showComposer && (
        <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <textarea
            value={noteBody}
            onChange={(e) => setNoteBody(e.target.value.slice(0, 500))}
            placeholder={`Why did you ${event.event_type === 'added_stock' ? 'buy' : 'sell'} ${stockName}?`}
            rows={2}
            autoFocus
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2"
            style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setShowComposer(false); setNoteBody(''); }}
              className="px-3 py-1 rounded-lg text-xs bg-transparent border-none cursor-pointer"
              style={{ color: 'var(--text-muted)' }}
            >
              Cancel
            </button>
            <button
              onClick={handlePostNote}
              disabled={!noteBody.trim() || posting}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 border-none cursor-pointer"
              style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}
            >
              <Send size={11} /> {posting ? '...' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
