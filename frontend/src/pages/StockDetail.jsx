import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Send } from 'lucide-react';
import api from '../utils/api';
import NoteCard from '../components/NoteCard';
import NoteComposer from '../components/NoteComposer';
import TierBadge from '../components/TierBadge';

export default function StockDetail() {
  const { contractCode } = useParams();
  const [searchParams] = useSearchParams();
  const stockName = searchParams.get('name') || contractCode;

  const [summary, setSummary] = useState('');
  const [theses, setTheses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState('summary');
  const [newThesis, setNewThesis] = useState('');
  const [thesisVisibility, setThesisVisibility] = useState('inner_circle');
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [posting, setPosting] = useState(false);

  useEffect(() => {
    api.get(`/feed/stock-summary?contract_code=${contractCode}&stock_name=${encodeURIComponent(stockName)}`)
      .then((res) => setSummary(res.data.summary))
      .catch(() => setSummary('AI summary unavailable'))
      .finally(() => setLoadingSummary(false));
    api.get(`/theses/stock/${contractCode}`).then((res) => setTheses(res.data)).catch(() => {});
    api.get(`/notes/stock/${contractCode}`).then((res) => setNotes(res.data)).catch(() => {});
  }, [contractCode, stockName]);

  const handlePostThesis = async (e) => {
    e.preventDefault();
    if (!newThesis.trim()) return;
    setPosting(true);
    try {
      const res = await api.post('/theses/', { contract_code: contractCode, stock_name: stockName, body: newThesis, visibility: thesisVisibility });
      setTheses([res.data, ...theses]);
      setNewThesis('');
    } catch { alert('Failed to post thesis'); }
    finally { setPosting(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <div className="mb-5">
        <h1 className="text-2xl font-semibold mb-1 m-0" style={{ color: 'var(--text-primary)' }}>{stockName}</h1>
        <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>{contractCode}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        {['summary', 'theses', 'notes'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-medium capitalize border-none cursor-pointer"
            style={{
              backgroundColor: tab === t ? 'var(--accent-light)' : 'var(--bg-card)',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${tab === t ? '#C7D2FE' : 'var(--border)'}`,
            }}>
            {t === 'summary' ? 'AI Summary' : t}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          {loadingSummary
            ? <div className="flex items-center justify-center h-20"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} /></div>
            : <p className="text-sm leading-relaxed whitespace-pre-line m-0" style={{ color: 'var(--text-primary)' }}>{summary}</p>
          }
        </div>
      )}

      {tab === 'theses' && (
        <>
          <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <h3 className="text-sm font-semibold mb-3 m-0" style={{ color: 'var(--text-primary)' }}>Share your thesis</h3>
            <form onSubmit={handlePostThesis}>
              <textarea value={newThesis} onChange={(e) => setNewThesis(e.target.value)} placeholder="Why did you buy this stock?" rows={3}
                className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2"
                style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-primary)' }} />
              <div className="flex items-center justify-between">
                <select value={thesisVisibility} onChange={(e) => setThesisVisibility(e.target.value)}
                  className="text-xs px-2 py-1 rounded-md outline-none cursor-pointer"
                  style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                  <option value="public">Public</option>
                  <option value="inner_circle">Inner Circle</option>
                  <option value="vault">Vault</option>
                </select>
                <button type="submit" disabled={posting || !newThesis.trim()}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold disabled:opacity-40 border-none cursor-pointer"
                  style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                  <Send size={13} />{posting ? '...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
          {theses.map((t) => (
            <div key={t.id} className="rounded-xl p-5 mb-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{t.display_name}</span>
                <TierBadge tier={t.visibility} />
              </div>
              <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{t.body}</p>
              <p className="text-xs mt-2 m-0" style={{ color: 'var(--text-muted)' }}>
                {new Date(t.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            </div>
          ))}
        </>
      )}

      {tab === 'notes' && (
        <>
          <NoteComposer stockTag={contractCode} stockName={stockName} onPosted={(n) => setNotes([n, ...notes])} />
          {notes.length === 0
            ? <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>No notes about this stock yet</p>
            : notes.map((n) => <NoteCard key={n.id} note={n} />)
          }
        </>
      )}
    </div>
  );
}
