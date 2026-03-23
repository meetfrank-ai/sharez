import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Heart, MessageCircle } from 'lucide-react';
import TierBadge from './TierBadge';
import api from '../utils/api';

export default function NoteCard({ note }) {
  const [liked, setLiked] = useState(note.liked_by_me);
  const [likeCount, setLikeCount] = useState(note.like_count);

  const toggleLike = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (liked) {
        const res = await api.delete(`/notes/${note.id}/like`);
        setLikeCount(res.data.like_count);
        setLiked(false);
      } else {
        const res = await api.post(`/notes/${note.id}/like`);
        setLikeCount(res.data.like_count);
        setLiked(true);
      }
    } catch {}
  };

  const time = new Date(note.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Link to={`/note/${note.id}`} className="block no-underline">
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
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {note.display_name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {note.display_name}
            </span>
            <span className="text-xs ml-2" style={{ color: 'var(--text-muted)' }}>
              {time}
            </span>
          </div>
          <TierBadge tier={note.visibility} />
        </div>

        {/* Body */}
        <p className="text-sm leading-relaxed whitespace-pre-line m-0 mb-3" style={{ color: 'var(--text-primary)' }}>
          {note.body}
        </p>

        {/* Stock tag */}
        {note.stock_name && (
          <Link
            to={`/stock/${note.stock_tag}?name=${encodeURIComponent(note.stock_name)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium no-underline mb-3"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
          >
            {note.stock_name}
          </Link>
        )}

        {/* Footer */}
        <div className="flex items-center gap-5 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
          <button
            onClick={toggleLike}
            className="flex items-center gap-1.5 text-xs bg-transparent border-none cursor-pointer p-0"
            style={{ color: liked ? 'var(--danger)' : 'var(--text-muted)' }}
          >
            <Heart size={15} fill={liked ? 'var(--danger)' : 'none'} />
            {likeCount}
          </button>
          <span className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            <MessageCircle size={15} />
            {note.reply_count}
          </span>
        </div>
      </div>
    </Link>
  );
}
