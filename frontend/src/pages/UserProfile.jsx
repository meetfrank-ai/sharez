import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Linkedin, Globe, ExternalLink } from 'lucide-react';
import api from '../utils/api';
import HoldingCard from '../components/HoldingCard';
import NoteCard from '../components/NoteCard';
import TierBadge from '../components/TierBadge';
import FollowButton from '../components/FollowButton';

export default function UserProfile() {
  const { userId } = useParams();
  const [profile, setProfile] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [theses, setTheses] = useState([]);
  const [notes, setNotes] = useState([]);
  const [tab, setTab] = useState('portfolio');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get(`/profile/${userId}`),
      api.get(`/portfolio/user/${userId}`),
      api.get(`/theses/user/${userId}`),
      api.get(`/notes/user/${userId}`),
    ])
      .then(([p, h, t, n]) => { setProfile(p.data); setHoldings(h.data); setTheses(t.data); setNotes(n.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading || !profile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      {/* Header */}
      <div className="rounded-xl p-6 mb-5 text-center" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold mx-auto mb-3"
          style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
          {profile.display_name?.charAt(0).toUpperCase()}
        </div>
        <h2 className="text-lg font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{profile.display_name}</h2>
        {profile.bio && <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>{profile.bio}</p>}
        <div className="flex justify-center gap-5 mt-3 mb-3">
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{profile.follower_count}</strong> followers
          </span>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            <strong style={{ color: 'var(--text-primary)' }}>{profile.following_count}</strong> following
          </span>
        </div>
        {/* Social links */}
        {(profile.linkedin_url || profile.twitter_url || profile.website_url) && (
          <div className="flex justify-center gap-3 mb-3">
            {profile.linkedin_url && (
              <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center no-underline transition-colors"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                <Linkedin size={15} />
              </a>
            )}
            {profile.twitter_url && (
              <a href={profile.twitter_url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center no-underline transition-colors"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                <ExternalLink size={15} />
              </a>
            )}
            {profile.website_url && (
              <a href={profile.website_url} target="_blank" rel="noopener noreferrer"
                className="w-8 h-8 rounded-lg flex items-center justify-center no-underline transition-colors"
                style={{ backgroundColor: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>
                <Globe size={15} />
              </a>
            )}
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <TierBadge tier={profile.your_tier || 'public'} />
          <FollowButton userId={profile.id} initialTier={profile.your_tier === 'public' ? null : profile.your_tier} vaultPrice={profile.vault_price_cents} />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-5">
        {['portfolio', 'theses', 'notes'].map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all border-none cursor-pointer"
            style={{
              backgroundColor: tab === t ? 'var(--accent-light)' : 'var(--bg-card)',
              color: tab === t ? 'var(--accent)' : 'var(--text-muted)',
              border: `1px solid ${tab === t ? '#C7D2FE' : 'var(--border)'}`,
            }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'portfolio' && (holdings.length === 0
        ? <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>No visible holdings</p>
        : holdings.map((h) => <HoldingCard key={h.id} holding={h} userId={userId} />)
      )}

      {tab === 'theses' && (theses.length === 0
        ? <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>No visible theses</p>
        : theses.map((t) => (
          <div key={t.id} className="rounded-xl p-5 mb-3" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold" style={{ color: 'var(--accent)' }}>{t.stock_name}</span>
              <TierBadge tier={t.visibility} />
            </div>
            <p className="text-sm whitespace-pre-line" style={{ color: 'var(--text-primary)' }}>{t.body}</p>
            <p className="text-xs mt-2 m-0" style={{ color: 'var(--text-muted)' }}>
              {new Date(t.created_at).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          </div>
        ))
      )}

      {tab === 'notes' && (notes.length === 0
        ? <p className="text-center text-sm" style={{ color: 'var(--text-muted)' }}>No visible notes</p>
        : notes.map((n) => <NoteCard key={n.id} note={n} />)
      )}
    </div>
  );
}
