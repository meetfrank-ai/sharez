import { useState } from 'react';
import { Send } from 'lucide-react';
import api from '../utils/api';

export default function NoteComposer({ stockTag, stockName, parentNoteId, onPosted }) {
  const [body, setBody] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [posting, setPosting] = useState(false);

  const handlePost = async () => {
    if (!body.trim() || posting) return;
    setPosting(true);
    try {
      const res = await api.post('/notes/', {
        body: body.trim(),
        visibility,
        stock_tag: stockTag || null,
        stock_name: stockName || null,
        parent_note_id: parentNoteId || null,
      });
      setBody('');
      onPosted?.(res.data);
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to post');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 mb-4"
      style={{
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)',
      }}
    >
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={parentNoteId ? "Write a reply..." : "What's on your mind?"}
        rows={2}
        className="w-full px-0 py-1 text-sm outline-none resize-none bg-transparent border-none"
        style={{ color: 'var(--text-primary)' }}
      />

      <div className="flex items-center justify-between pt-3" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          {!parentNoteId && (
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value)}
              className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-page)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <option value="public">Public</option>
            </select>
          )}
        </div>

        <button
          onClick={handlePost}
          disabled={!body.trim() || posting}
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-40"
          style={{
            backgroundColor: 'var(--accent)',
            color: '#FFFFFF',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <Send size={13} />
          {posting ? '...' : 'Post'}
        </button>
      </div>
    </div>
  );
}
