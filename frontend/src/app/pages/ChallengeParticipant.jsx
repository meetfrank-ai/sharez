import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ChevronLeft, Lock, ChevronUp, ChevronDown, Plus } from 'lucide-react';
import api from '../utils/api';

const COLORS = ['#7F77DD', '#D85A30', '#1D9E75', '#378ADD', '#D4537E', '#639922', '#BA7517', '#534AB7'];
const getColor = (id) => COLORS[String(id).split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

/**
 * Participant page — shows their 5 picks with original locked theses,
 * append-only updates, and (if viewing self) a button to add an update
 * per pick (quarterly mechanic).
 */
export default function ChallengeParticipant() {
  const { slug, userId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Update form state per thesis id
  const [openUpdate, setOpenUpdate] = useState(null);
  const [updateBody, setUpdateBody] = useState('');
  const [savingUpdate, setSavingUpdate] = useState(false);

  const load = () => {
    setLoading(true);
    api.get(`/challenges/${slug}/participants/${userId}`)
      .then(({ data }) => setData(data))
      .catch(err => setError(err.response?.data?.detail || 'Could not load participant'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [slug, userId]);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB' }} /></div>;
  if (error) return <div className="max-w-2xl mx-auto px-4 py-6 text-sm" style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!data) return null;

  const { challenge, participant, picks } = data;

  const submitUpdate = async (thesisId) => {
    if (!updateBody.trim()) return;
    setSavingUpdate(true);
    try {
      await api.post(`/challenges/${slug}/theses/${thesisId}/update`, { body: updateBody });
      setOpenUpdate(null);
      setUpdateBody('');
      load();
    } catch (err) {
      alert(err.response?.data?.detail || 'Could not save update');
    } finally {
      setSavingUpdate(false);
    }
  };

  const ret = participant.return_pct;
  const positive = ret != null && ret >= 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to={`/challenges/${slug}/leaderboard`} className="flex items-center gap-1 text-sm mb-4 no-underline" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={16} /> Leaderboard
      </Link>

      {/* Header */}
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-semibold text-white shrink-0"
            style={{ backgroundColor: getColor(participant.user_id) }}>
            {(participant.display_name || '').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
              {participant.display_name}{participant.is_you && ' · you'}
            </h1>
            {participant.handle && <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>@{participant.handle}</p>}
          </div>
          <div className="flex items-center gap-1 shrink-0" style={{ color: positive ? '#16A34A' : '#DC2626' }}>
            {ret != null && (positive ? <ChevronUp size={16} /> : <ChevronDown size={16} />)}
            <span className="text-base font-semibold" style={{ fontVariantNumeric: 'tabular-nums' }}>
              {ret == null ? '—' : `${positive ? '+' : ''}${ret.toFixed(2)}%`}
            </span>
          </div>
        </div>
        <p className="text-xs m-0 mt-2" style={{ color: 'var(--text-muted)' }}>
          {challenge.name} · {picks.length} of {challenge.pick_count} picks
        </p>
      </div>

      {/* Picks */}
      <ul className="m-0 pl-0 list-none space-y-3">
        {picks.map((t, i) => (
          <li key={t.id} className="rounded-xl p-5" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  PICK {i + 1}
                </span>
                <h3 className="text-base font-semibold m-0 truncate" style={{ color: 'var(--text-primary)' }}>
                  {t.stock_name}
                </h3>
                {t.is_locked && (
                  <span title="Locked at lockup" style={{ color: 'var(--text-muted)' }}>
                    <Lock size={12} />
                  </span>
                )}
              </div>
              <Link to={`/stock/${t.contract_code}?name=${encodeURIComponent(t.stock_name)}`}
                className="text-xs font-semibold no-underline" style={{ color: 'var(--accent)' }}>
                View stock →
              </Link>
            </div>
            {t.title && (
              <p className="text-sm font-medium m-0 mb-1" style={{ color: 'var(--text-primary)' }}>{t.title}</p>
            )}
            <p className="text-sm m-0 whitespace-pre-line" style={{ color: 'var(--text-secondary)' }}>{t.body}</p>

            {(t.updates || []).length > 0 && (
              <div className="mt-3 pt-3 space-y-2" style={{ borderTop: '1px dashed var(--border)' }}>
                {t.updates.map((u) => (
                  <div key={u.id}>
                    <p className="text-[10px] m-0 font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      UPDATE · {new Date(u.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    <p className="text-sm m-0 whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{u.body}</p>
                  </div>
                ))}
              </div>
            )}

            {participant.is_you && t.is_locked && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px dashed var(--border)' }}>
                {openUpdate === t.id ? (
                  <div>
                    <textarea
                      value={updateBody}
                      onChange={(e) => setUpdateBody(e.target.value)}
                      rows={3}
                      placeholder="What's changed in your view since the original thesis?"
                      className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none mb-2"
                      style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => { setOpenUpdate(null); setUpdateBody(''); }}
                        className="text-xs bg-transparent border-none cursor-pointer" style={{ color: 'var(--text-muted)' }}>
                        Cancel
                      </button>
                      <button onClick={() => submitUpdate(t.id)} disabled={savingUpdate || !updateBody.trim()}
                        className="text-xs font-semibold px-3 py-1.5 rounded-md disabled:opacity-50 border-none cursor-pointer"
                        style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
                        {savingUpdate ? '…' : 'Add update'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => { setOpenUpdate(t.id); setUpdateBody(''); }}
                    className="flex items-center gap-1.5 text-xs font-semibold bg-transparent border-none cursor-pointer"
                    style={{ color: 'var(--accent)' }}>
                    <Plus size={12} /> Add update to this pick
                  </button>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      {picks.length === 0 && (
        <div className="rounded-xl p-6 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
          <p className="text-sm m-0" style={{ color: 'var(--text-secondary)' }}>
            {participant.is_you ? 'You haven\'t submitted picks yet.' : 'No picks submitted.'}
          </p>
        </div>
      )}
    </div>
  );
}
