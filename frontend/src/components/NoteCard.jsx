import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, MessageCircle, Send, Share2, Lock, Bookmark, Repeat2, LinkIcon, X } from 'lucide-react';
import TierBadge from './TierBadge';
import api from '../utils/api';
import { useAuth } from '../hooks/useAuth';

export default function NoteCard({ note, onReplyPosted }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(note.liked_by_me);
  const [likeCount, setLikeCount] = useState(note.like_count);
  const [replyCount, setReplyCount] = useState(note.reply_count || 0);
  const [reshareCount, setReshareCount] = useState(note.reshare_count || 0);
  const [reshared, setReshared] = useState(note.reshared_by_me);
  const [saved, setSaved] = useState(note.saved_by_me);
  const [showReply, setShowReply] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [replyBody, setReplyBody] = useState('');
  const [posting, setPosting] = useState(false);

  const toggleLike = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try {
      if (liked) {
        const res = await api.delete(`/notes/${note.id}/like`);
        setLikeCount(res.data.like_count); setLiked(false);
      } else {
        const res = await api.post(`/notes/${note.id}/like`);
        setLikeCount(res.data.like_count); setLiked(true);
      }
    } catch {}
  };

  const toggleSave = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try {
      if (saved) {
        await api.delete(`/notes/${note.id}/save`);
        setSaved(false);
      } else {
        await api.post(`/notes/${note.id}/save`);
        setSaved(true);
      }
    } catch {}
  };

  const toggleReshare = async (e) => {
    e.preventDefault(); e.stopPropagation();
    try {
      if (reshared) {
        const res = await api.delete(`/notes/${note.id}/reshare`);
        setReshareCount(res.data.reshare_count); setReshared(false);
      } else {
        const res = await api.post(`/notes/${note.id}/reshare`);
        setReshareCount(res.data.reshare_count); setReshared(true);
      }
    } catch {}
  };

  const handleCommentClick = (e) => {
    e.preventDefault(); e.stopPropagation();
    setShowReply(!showReply);
  };

  const handlePostReply = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!replyBody.trim() || posting) return;
    setPosting(true);
    try {
      await api.post('/notes/', { body: replyBody.trim(), visibility: note.visibility || 'public', parent_note_id: note.id });
      setReplyBody(''); setShowReply(false); setReplyCount(replyCount + 1);
      onReplyPosted?.();
    } catch { alert('Failed to post reply'); }
    finally { setPosting(false); }
  };

  const handleShareClick = (e) => {
    e.preventDefault(); e.stopPropagation();
    setShowShareMenu(!showShareMenu);
  };

  const shareUrl = `${window.location.origin}/note/${note.id}`;
  const shareText = `${note.display_name}: "${note.body?.slice(0, 100)}${note.body?.length > 100 ? '...' : ''}" — on Sharez`;

  const copyLink = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(shareUrl);
    setShowShareMenu(false);
  };

  const time = new Date(note.created_at).toLocaleDateString('en-ZA', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });

  return (
    <div className="rounded-xl mb-4 transition-all hover:shadow-md"
      style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
      {/* Clickable note content */}
      <div className="p-5 pb-0 cursor-pointer" onClick={() => navigate(`/note/${note.id}`)}>
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <Link to={`/user/${note.user_id}`} className="no-underline shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold hover:opacity-80 transition-opacity"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              {note.display_name?.charAt(0).toUpperCase()}
            </div>
          </Link>
          <div className="flex-1 min-w-0">
            <Link to={`/user/${note.user_id}`} className="text-sm font-semibold no-underline hover:underline" style={{ color: 'var(--text-primary)' }} onClick={(e) => e.stopPropagation()}>
              {note.display_name}
            </Link>
            {note.handle && <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>@{note.handle}</span>}
            <span className="text-xs ml-1.5" style={{ color: 'var(--text-muted)' }}>· {time}</span>
          </div>
          <TierBadge tier={note.visibility} />
        </div>

        {/* Body */}
        {note.locked ? (
          <div className="relative mb-3">
            <p className="text-sm leading-relaxed whitespace-pre-line m-0" style={{ color: 'var(--text-primary)', filter: 'blur(4px)', userSelect: 'none' }}>{note.body}</p>
            <div className="flex items-center gap-2 mt-2">
              <Lock size={14} style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {note.visibility === 'vault' ? 'Join vault to read' : 'Follow to unlock'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm leading-relaxed whitespace-pre-line m-0 mb-3" style={{ color: 'var(--text-primary)' }}>{note.body}</p>
        )}

        {/* Stock tag */}
        {note.stock_name && (
          <Link to={`/stock/${note.stock_tag}?name=${encodeURIComponent(note.stock_name)}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium no-underline mb-3"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {note.stock_name}
          </Link>
        )}
      </div>

      {/* Footer — actions */}
      {!note.locked && (
        <div className="flex items-center px-5 py-3 relative" style={{ borderTop: '1px solid var(--border)' }}>
          <button onClick={toggleLike}
            className="flex items-center gap-1.5 text-xs bg-transparent border-none cursor-pointer p-0 mr-5"
            style={{ color: liked ? 'var(--danger)' : 'var(--text-muted)' }}>
            <Heart size={15} fill={liked ? 'var(--danger)' : 'none'} /> {likeCount}
          </button>
          <button onClick={handleCommentClick}
            className="flex items-center gap-1.5 text-xs bg-transparent border-none cursor-pointer p-0 mr-5"
            style={{ color: showReply ? 'var(--accent)' : 'var(--text-muted)' }}>
            <MessageCircle size={15} /> {replyCount}
          </button>
          <button onClick={toggleReshare}
            className="flex items-center gap-1.5 text-xs bg-transparent border-none cursor-pointer p-0 mr-5"
            style={{ color: reshared ? 'var(--success)' : 'var(--text-muted)' }}>
            <Repeat2 size={15} /> {reshareCount}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <button onClick={toggleSave}
              className="bg-transparent border-none cursor-pointer p-0"
              style={{ color: saved ? 'var(--accent)' : 'var(--text-muted)' }}>
              <Bookmark size={15} fill={saved ? 'var(--accent)' : 'none'} />
            </button>
            <button onClick={handleShareClick}
              className="bg-transparent border-none cursor-pointer p-0"
              style={{ color: 'var(--text-muted)' }}>
              <Share2 size={14} />
            </button>
          </div>

          {/* Share menu */}
          {showShareMenu && (
            <div className="absolute right-4 bottom-12 rounded-lg shadow-lg p-2 z-10"
              style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', minWidth: 160 }}>
              <button onClick={copyLink} className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-left bg-transparent border-none cursor-pointer"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                <LinkIcon size={13} /> Copy link
              </button>
              <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs no-underline"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                𝕏 Share on X
              </a>
              <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs no-underline"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                in Share on LinkedIn
              </a>
              <a href={`https://wa.me/?text=${encodeURIComponent(shareText + ' ' + shareUrl)}`}
                target="_blank" rel="noopener noreferrer"
                className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs no-underline"
                style={{ color: 'var(--text-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                💬 Share on WhatsApp
              </a>
            </div>
          )}
        </div>
      )}

      {/* Inline reply bar */}
      {showReply && !note.locked && (
        <div className="px-5 pb-4" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold shrink-0"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
              {user?.display_name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div className="flex-1 flex items-center gap-2 rounded-full px-3 py-1.5" style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)' }}>
              <input type="text" value={replyBody} onChange={(e) => setReplyBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handlePostReply(e); }}
                placeholder="Write a reply..." autoFocus
                className="flex-1 text-sm bg-transparent border-none outline-none" style={{ color: 'var(--text-primary)' }} />
              <button onClick={handlePostReply} disabled={!replyBody.trim() || posting}
                className="flex items-center justify-center w-7 h-7 rounded-full border-none cursor-pointer disabled:opacity-30"
                style={{ backgroundColor: 'var(--accent)', color: '#fff' }}>
                <Send size={12} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
