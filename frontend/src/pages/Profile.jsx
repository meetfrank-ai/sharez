import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sliders, Users, Save, LogOut, Smartphone, ChevronRight } from 'lucide-react';
import api from '../utils/api';

/* ── Design tokens ── */
const T = {
  bg: '#F6F7FB', card: '#FFFFFF', border: '#E6E9F2', surface: '#F1F3F9',
  purple: '#7C5CE0', purpleLight: '#F0EEFF', purpleHover: '#6B4ED0',
  green: '#10B981', red: '#EF4444',
  t1: '#111318', t2: '#6B7280', t3: '#9AA1AC',
  shadow: '0 4px 12px rgba(0,0,0,0.04)',
};
const card = { background: T.card, border: `1px solid ${T.border}`, borderRadius: 16, boxShadow: T.shadow };
const input = { background: T.card, border: `1px solid ${T.border}`, color: T.t1, borderRadius: 12, fontSize: 14, fontWeight: 400 };

export default function Profile() {
  const { user, logout, setUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedin_url || '');
  const [twitterUrl, setTwitterUrl] = useState(user?.twitter_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.website_url || '');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const handleSave = async () => {
    setSaving(true); setMsg('');
    try {
      const res = await api.put('/auth/profile', {
        display_name: displayName, bio,
        linkedin_url: linkedinUrl || null, twitter_url: twitterUrl || null, website_url: websiteUrl || null,
      });
      setUser(res.data);
      setMsg('Saved!');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Failed to save'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ backgroundColor: T.bg, minHeight: '100vh', fontFamily: "'Inter', -apple-system, sans-serif" }}>
      <div className="max-w-2xl mx-auto" style={{ padding: '24px 16px 120px' }}>

        {/* Page header */}
        <h1 className="m-0" style={{ fontSize: 22, fontWeight: 600, color: T.t1, marginBottom: 24 }}>Settings</h1>

        {/* ── Profile card ── */}
        <div style={{ ...card, padding: 24, marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span style={{ fontSize: 15, fontWeight: 600, color: T.t1 }}>Your profile</span>
            <Link to={`/user/${user?.id}`} className="no-underline" style={{ fontSize: 13, fontWeight: 500, color: T.purple }}>
              View profile
            </Link>
          </div>

          {/* Avatar + info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%', background: T.purpleLight,
              color: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 24, fontWeight: 600, flexShrink: 0,
            }}>
              {displayName?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: T.t1 }}>{user?.display_name}</span>
                {user?.portfolio_imported_at && (
                  <div style={{ width: 14, height: 14, borderRadius: '50%', background: T.purple, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="8" height="8" viewBox="0 0 16 16" fill="none"><path d="M13.3 4.3L6.5 11.1 2.7 7.3" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  </div>
                )}
              </div>
              <div style={{ fontSize: 13, color: T.t3 }}>@{user?.handle} · {user?.email}</div>
            </div>
          </div>

          {/* Form fields */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Field label="Display name" value={displayName} onChange={setDisplayName} />
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: T.t2, marginBottom: 6 }}>Bio</label>
              <textarea value={bio} onChange={e => setBio(e.target.value)} rows={2}
                placeholder="Tell people about your investing style..."
                className="w-full outline-none resize-none"
                style={{ ...input, padding: '10px 14px' }} />
            </div>
            <Field label="LinkedIn" value={linkedinUrl} onChange={setLinkedinUrl} placeholder="https://linkedin.com/in/you" />
            <Field label="X / Twitter" value={twitterUrl} onChange={setTwitterUrl} placeholder="https://x.com/you" />
            <Field label="Website" value={websiteUrl} onChange={setWebsiteUrl} placeholder="https://your-blog.com" />

            <button onClick={handleSave} disabled={saving}
              className="border-none cursor-pointer flex items-center justify-center gap-2"
              style={{
                width: '100%', padding: '12px 24px', borderRadius: 12,
                fontSize: 14, fontWeight: 500, background: T.purple, color: '#fff',
                boxShadow: '0 4px 12px rgba(124,92,224,0.2)',
                opacity: saving ? 0.6 : 1, transition: 'all 150ms ease',
              }}>
              <Save size={15} /> {saving ? 'Saving...' : 'Save profile'}
            </button>
            {msg && <p className="m-0 text-center" style={{ fontSize: 12, color: msg === 'Saved!' ? T.green : T.red }}>{msg}</p>}
          </div>
        </div>

        {/* ── Quick links ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <SettingsLink to="/tier-settings" icon={<Sliders size={18} />} title="Tier settings" desc="Configure what followers can see" />
          <SettingsLink to="/followers" icon={<Users size={18} />} title="Connections" desc="Manage followers & following" />
        </div>

        {/* ── Install app ── */}
        <div style={{ ...card, padding: 20, marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: 12, background: T.purpleLight, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Smartphone size={18} style={{ color: T.purple }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 500, color: T.t1 }}>Install Stance</div>
              <div style={{ fontSize: 12, color: T.t3 }}>Add to your home screen</div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['iPhone', 'Tap share (↑) in Safari → "Add to Home Screen"'],
              ['Android', 'Tap menu (⋮) in Chrome → "Install app"'],
              ['Desktop', 'Click install icon (⊕) in the address bar'],
            ].map(([platform, instruction]) => (
              <div key={platform} style={{ fontSize: 12, color: T.t2, lineHeight: 1.5 }}>
                <strong style={{ color: T.t1 }}>{platform}:</strong> {instruction}
              </div>
            ))}
          </div>
        </div>

        {/* ── Sign out ── */}
        <button onClick={logout}
          className="w-full border-none cursor-pointer flex items-center justify-center gap-2"
          style={{
            padding: '12px 24px', borderRadius: 12, fontSize: 14, fontWeight: 500,
            background: T.card, color: T.t3, border: `1.5px solid ${T.border}`,
            transition: 'all 150ms ease',
          }}>
          <LogOut size={15} /> Sign out
        </button>

      </div>
    </div>
  );
}

/* ── Reusable form field ── */
function Field({ label, value, onChange, placeholder }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#6B7280', marginBottom: 6 }}>{label}</label>
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full outline-none"
        style={{ background: '#FFFFFF', border: '1px solid #E6E9F2', color: '#111318', borderRadius: 12, fontSize: 14, padding: '10px 14px' }} />
    </div>
  );
}

/* ── Settings link row ── */
function SettingsLink({ to, icon, title, desc }) {
  return (
    <Link to={to} className="no-underline"
      style={{
        background: '#FFFFFF', border: '1px solid #E6E9F2', borderRadius: 16,
        boxShadow: '0 4px 12px rgba(0,0,0,0.04)', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: 14,
        transition: 'box-shadow 200ms ease, transform 200ms ease',
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}>
      <div style={{ width: 40, height: 40, borderRadius: 12, background: '#F0EEFF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7C5CE0', flexShrink: 0 }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, fontWeight: 500, color: '#111318' }}>{title}</div>
        <div style={{ fontSize: 12, color: '#9AA1AC' }}>{desc}</div>
      </div>
      <ChevronRight size={16} style={{ color: '#CCC' }} />
    </Link>
  );
}
