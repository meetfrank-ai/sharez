import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../utils/api';
import NoteCard from '../components/NoteCard';
import NoteComposer from '../components/NoteComposer';

export default function NoteThread() {
  const { noteId } = useParams();
  const [thread, setThread] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/notes/${noteId}/thread`)
      .then((res) => setThread(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [noteId]);

  if (loading) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
    </div>;
  }

  const parent = thread[0];
  const replies = thread.slice(1);

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold mb-5 m-0" style={{ color: 'var(--text-primary)' }}>Thread</h1>

      {parent && <NoteCard note={parent} />}

      <NoteComposer parentNoteId={parseInt(noteId)} onPosted={(r) => setThread([...thread, r])} />

      {replies.length > 0 && (
        <div className="ml-5 pl-4" style={{ borderLeft: '2px solid var(--border)' }}>
          {replies.map((r) => <NoteCard key={r.id} note={r} />)}
        </div>
      )}
    </div>
  );
}
