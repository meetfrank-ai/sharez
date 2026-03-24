import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Sliders, Users, Link2, Save } from 'lucide-react';
import api from '../utils/api';

export default function Profile() {
  const { user, logout, setUser } = useAuth();

  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [linkedinUrl, setLinkedinUrl] = useState(user?.linkedin_url || '');
  const [twitterUrl, setTwitterUrl] = useState(user?.twitter_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(user?.website_url || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState('');

  const [eeUsername, setEeUsername] = useState('');
  const [eePassword, setEePassword] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [eeMsg, setEeMsg] = useState('');

  const inputStyle = { backgroundColor: '#FFFFFF', border: '1px solid var(--border)', color: 'var(--text-primary)' };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMsg('');
    try {
      const res = await api.put('/auth/profile', {
        display_name: displayName,
        bio,
        linkedin_url: linkedinUrl || null,
        twitter_url: twitterUrl || null,
        website_url: websiteUrl || null,
      });
      setUser(res.data);
      setProfileMsg('Saved!');
      setTimeout(() => setProfileMsg(''), 3000);
    } catch {
      setProfileMsg('Failed to save');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleConnectEE = async (e) => {
    e.preventDefault();
    setConnecting(true);
    setEeMsg('');
    try {
      await api.post('/portfolio/connect-ee', { ee_username: eeUsername, ee_password: eePassword });
      setEeMsg('Connected! Portfolio synced.');
      setEeUsername('');
      setEePassword('');
    } catch (err) {
      setEeMsg(err.response?.data?.detail || 'Connection failed');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <h1 className="text-2xl font-semibold mb-4 m-0" style={{ color: 'var(--text-primary)' }}>Settings</h1>

      {/* Profile editing */}
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <h2 className="text-sm font-semibold mb-4 m-0" style={{ color: 'var(--text-primary)' }}>Your Profile</h2>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-xl font-semibold"
            style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}>
            {displayName?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{user?.display_name}</p>
            <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Display name</label>
            <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Bio</label>
            <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={2} placeholder="Tell people about your investing style..."
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none resize-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>LinkedIn URL</label>
            <input type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} placeholder="https://linkedin.com/in/you"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>X / Twitter URL</label>
            <input type="url" value={twitterUrl} onChange={(e) => setTwitterUrl(e.target.value)} placeholder="https://x.com/you"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <div>
            <label className="block text-xs mb-1 font-medium" style={{ color: 'var(--text-secondary)' }}>Website</label>
            <input type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://your-blog.com"
              className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          </div>
          <button onClick={handleSaveProfile} disabled={savingProfile}
            className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            <Save size={14} />{savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
          {profileMsg && <p className="text-xs text-center m-0" style={{ color: 'var(--success)' }}>{profileMsg}</p>}
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Link to="/tier-settings" className="rounded-xl p-4 no-underline transition-all hover:shadow-md flex items-center gap-3"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
            <Sliders size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Tier Settings</p>
            <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>Configure visibility</p>
          </div>
        </Link>
        <Link to="/followers" className="rounded-xl p-4 no-underline transition-all hover:shadow-md flex items-center gap-3"
          style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
            <Users size={16} style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Connections</p>
            <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>Followers & following</p>
          </div>
        </Link>
      </div>

      {/* EE connection */}
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <div className="flex items-center gap-2 mb-3">
          <Link2 size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Connect EasyEquities</h2>
        </div>
        <form onSubmit={handleConnectEE} className="space-y-3">
          <input type="text" placeholder="EE Username" value={eeUsername} onChange={(e) => setEeUsername(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          <input type="password" placeholder="EE Password" value={eePassword} onChange={(e) => setEePassword(e.target.value)} required
            className="w-full px-3 py-2.5 rounded-lg text-sm outline-none" style={inputStyle} />
          <button type="submit" disabled={connecting}
            className="w-full py-2.5 rounded-lg text-xs font-semibold transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer"
            style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
            {connecting ? 'Connecting...' : 'Connect & Sync'}
          </button>
        </form>
        {eeMsg && <p className="text-xs mt-2 m-0" style={{ color: 'var(--success)' }}>{eeMsg}</p>}
      </div>

      {/* Install app */}
      <div className="rounded-xl p-5 mb-4" style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
        <h2 className="text-sm font-semibold mb-2 m-0" style={{ color: 'var(--text-primary)' }}>Install Sharez app</h2>
        <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
          Add Sharez to your home screen for a native app experience. You'll also be able to share files directly from EasyEquities to Sharez.
        </p>
        <div className="space-y-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          <p className="m-0"><strong>iPhone:</strong> Tap the share button (↑) in Safari → "Add to Home Screen"</p>
          <p className="m-0"><strong>Android:</strong> Tap the menu (⋮) in Chrome → "Install app" or "Add to Home Screen"</p>
          <p className="m-0"><strong>Desktop:</strong> Click the install icon (⊕) in the address bar</p>
        </div>
      </div>

      <button onClick={logout}
        className="w-full py-2.5 rounded-lg text-sm font-medium cursor-pointer"
        style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>
        Sign Out
      </button>
    </div>
  );
}
