import { useState, useEffect } from 'react';
import { Bookmark } from 'lucide-react';
import api from '../utils/api';
import NoteCard from '../components/NoteCard';

export default function Saved() {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notes/saved')
      .then(res => setNotes(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
    </div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold mb-5 m-0" style={{ color: 'var(--text-primary)' }}>Saved</h1>

      {notes.length === 0 ? (
        <div className="text-center py-16 rounded-xl" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <Bookmark size={28} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
          <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>No saved notes yet</p>
          <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-muted)' }}>
            Tap the bookmark icon on any note to save it here
          </p>
        </div>
      ) : (
        notes.map(n => <NoteCard key={n.id} note={n} />)
      )}
    </div>
  );
}
