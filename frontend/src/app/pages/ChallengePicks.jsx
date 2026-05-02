import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Search, X, Lock } from 'lucide-react';
import api from '../utils/api';

/**
 * Pick-submission form. Participant searches for 5 JSE stocks, writes a
 * thesis per pick, hits Submit. Picks can be re-edited until lockup.
 *
 * Stock search hits the existing /api/stocks/search endpoint.
 */
export default function ChallengePicks() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [challenge, setChallenge] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Local pick state — array of length pick_count
  const [picks, setPicks] = useState([]);

  // Search state for the currently-active row
  const [searchOpenIdx, setSearchOpenIdx] = useState(null);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get(`/challenges/${slug}`),
      api.get(`/challenges/${slug}/participants/${'me'}`).catch(() => null),
    ]).then(async ([cRes]) => {
      if (cancelled) return;
      setChallenge(cRes.data);
      // Initialise picks array
      const blanks = Array.from({ length: cRes.data.pick_count }, () => ({
        contract_code: '',
        stock_name: '',
        title: '',
        body: '',
      }));
      // Load current user's existing picks if any
      try {
        const me = await api.get('/auth/me');
        const existing = await api.get(`/challenges/${slug}/participants/${me.data.id}`);
        const picks = existing.data?.picks || [];
        for (let i = 0; i < blanks.length && i < picks.length; i++) {
          blanks[i] = {
            contract_code: picks[i].contract_code,
            stock_name: picks[i].stock_name,
            title: picks[i].title || '',
            body: picks[i].body || '',
          };
        }
      } catch {
        // not a participant yet — fine
      }
      if (!cancelled) setPicks(blanks);
    }).catch(err => {
      if (!cancelled) setError(err.response?.data?.detail || 'Could not load challenge');
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [slug]);

  // Debounced stock search when typing
  useEffect(() => {
    if (searchOpenIdx == null) return;
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/stocks/search', { params: { q: query } });
        // Restrict to the challenge's market
        setResults((data || []).filter(s => !challenge?.market || s.exchange === challenge.market).slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [query, searchOpenIdx, challenge?.market]);

  const updatePick = (i, patch) => {
    setPicks(p => p.map((x, idx) => idx === i ? { ...x, ...patch } : x));
  };

  const selectStock = (i, stock) => {
    updatePick(i, {
      contract_code: stock.code,
      stock_name: stock.name,
    });
    setSearchOpenIdx(null);
    setQuery('');
    setResults([]);
  };

  const clearStock = (i) => {
    updatePick(i, { contract_code: '', stock_name: '' });
  };

  const submit = async () => {
    setError('');
    setSubmitting(true);
    try {
      await api.post(`/challenges/${slug}/picks`, { picks });
      // After saving, send them to their own participant page
      const me = await api.get('/auth/me');
      navigate(`/challenges/${slug}/participants/${me.data.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not save picks');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB' }} /></div>;
  if (error && !challenge) return <div className="max-w-2xl mx-auto px-4 py-6 text-sm" style={{ color: 'var(--danger)' }}>{error}</div>;
  if (!challenge) return null;

  if (challenge.my_picks_locked) {
    return (
      <div className="max-w-md mx-auto px-4 py-12 text-center">
        <Lock size={32} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
        <h1 className="text-lg font-semibold m-0 mb-2">Your picks are locked</h1>
        <p className="text-sm m-0 mb-4" style={{ color: 'var(--text-secondary)' }}>
          Lockup has passed and your picks are now part of the year-long contest.
        </p>
        <Link to={`/challenges/${slug}/leaderboard`}
          className="inline-block px-4 py-2.5 rounded-lg text-sm font-semibold no-underline"
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
          See leaderboard
        </Link>
      </div>
    );
  }

  const filledCount = picks.filter(p => p.contract_code && p.body.trim().length >= 10).length;
  const canSubmit = filledCount === challenge.pick_count;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link to={`/challenges/${slug}`} className="flex items-center gap-1 text-sm mb-4 no-underline" style={{ color: 'var(--text-muted)' }}>
        <ChevronLeft size={16} /> {challenge.name}
      </Link>

      <h1 className="text-xl font-semibold m-0 mb-1">Your {challenge.pick_count} picks</h1>
      <p className="text-xs m-0 mb-4" style={{ color: 'var(--text-muted)' }}>
        Pick {challenge.pick_count} {challenge.market} stocks and write a thesis for each. You can edit until lockup; after that, theses are immutable but you can append updates.
      </p>

      {error && (
        <div className="rounded-lg px-3 py-2 mb-3" style={{ backgroundColor: '#FEF2F2' }}>
          <p className="text-xs m-0" style={{ color: 'var(--danger)' }}>{error}</p>
        </div>
      )}

      <ul className="m-0 pl-0 list-none space-y-3">
        {picks.map((pk, i) => (
          <li key={i} className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-semibold tracking-wider" style={{ color: 'var(--text-muted)' }}>
                PICK {i + 1}
              </span>
              {pk.contract_code && (
                <button onClick={() => clearStock(i)}
                  className="text-xs bg-transparent border-none cursor-pointer flex items-center gap-1"
                  style={{ color: 'var(--text-muted)' }}>
                  <X size={10} /> Change stock
                </button>
              )}
            </div>

            {pk.contract_code ? (
              <p className="text-sm font-semibold m-0 mb-2" style={{ color: 'var(--text-primary)' }}>
                {pk.stock_name} <span style={{ color: 'var(--text-muted)' }}>· {pk.contract_code}</span>
              </p>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg mb-1" style={{ backgroundColor: 'var(--bg-page)', border: '1px solid var(--border)' }}>
                  <Search size={14} style={{ color: 'var(--text-muted)' }} />
                  <input
                    placeholder={`Search ${challenge.market} stocks…`}
                    value={searchOpenIdx === i ? query : ''}
                    onFocus={() => { setSearchOpenIdx(i); setQuery(''); }}
                    onChange={(e) => setQuery(e.target.value)}
                    className="flex-1 bg-transparent border-none outline-none text-sm"
                    style={{ color: 'var(--text-primary)' }}
                  />
                </div>
                {searchOpenIdx === i && (results.length > 0 || searching) && (
                  <div className="absolute left-0 right-0 top-full mt-1 rounded-lg overflow-hidden z-10"
                    style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
                    {searching && <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>Searching…</div>}
                    {results.map((s) => (
                      <button key={`${s.code}-${s.exchange}`}
                        onClick={() => selectStock(i, s)}
                        className="w-full text-left px-3 py-2 bg-transparent border-none cursor-pointer hover:opacity-80"
                        style={{ borderBottom: '1px solid var(--border)' }}>
                        <p className="text-sm font-medium m-0">{s.name}</p>
                        <p className="text-[11px] m-0" style={{ color: 'var(--text-muted)' }}>
                          {s.code} · {s.exchange}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {pk.contract_code && (
              <>
                <input
                  value={pk.title}
                  onChange={(e) => updatePick(i, { title: e.target.value })}
                  placeholder="Title for your thesis (optional)"
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none mb-2"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <textarea
                  value={pk.body}
                  onChange={(e) => updatePick(i, { body: e.target.value })}
                  rows={4}
                  placeholder="Why this stock? Locked at lockup — minimum 10 characters."
                  className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                />
                <div className="text-[11px] mt-1" style={{ color: pk.body.trim().length >= 10 ? 'var(--success)' : 'var(--text-muted)' }}>
                  {pk.body.trim().length} chars
                </div>
              </>
            )}
          </li>
        ))}
      </ul>

      <div className="sticky bottom-0 mt-4 pt-3 pb-1 flex items-center justify-between gap-3"
        style={{ backgroundColor: 'var(--bg-page)' }}>
        <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
          {filledCount} of {challenge.pick_count} ready
        </p>
        <button onClick={submit} disabled={!canSubmit || submitting}
          className="px-5 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-50 border-none cursor-pointer"
          style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
          {submitting ? 'Saving…' : 'Save picks'}
        </button>
      </div>
    </div>
  );
}
