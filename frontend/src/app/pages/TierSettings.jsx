import { useState, useEffect } from 'react';
import { Sliders, ChevronDown, ChevronRight, Eye, Users, Lock, BarChart3, Activity, FileText } from 'lucide-react';
import api from '../utils/api';

const OPTION_GROUPS = [
  {
    label: 'Portfolio Data',
    icon: BarChart3,
    items: [
      { key: 'sectors', label: 'Sector allocation' },
      { key: 'return_pct', label: 'Overall return %' },
      { key: 'stock_names', label: 'Stock names' },
      { key: 'allocation_pct', label: 'Allocation percentages' },
      { key: 'amounts', label: 'Rand amounts' },
    ],
  },
  {
    label: 'Activity',
    icon: Activity,
    items: [
      { key: 'buy_sell_history', label: 'Buy/sell history' },
      { key: 'realtime_changes', label: 'Real-time changes' },
    ],
  },
  {
    label: 'Content',
    icon: FileText,
    items: [
      { key: 'all_theses', label: 'All theses' },
      { key: 'free_theses', label: 'Free theses' },
      { key: 'exclusive_theses', label: 'Exclusive theses (paywalled)' },
      { key: 'all_notes', label: 'All notes' },
      { key: 'free_notes', label: 'Free notes' },
      { key: 'exclusive_notes', label: 'Exclusive notes (paywalled)' },
      { key: 'comments', label: 'Comments' },
    ],
  },
];

const TIERS = [
  { key: 'public_shows', label: 'Public', desc: 'What everyone on Sharez sees', icon: Eye, color: 'var(--text-muted)', bg: '#F3F4F6' },
];

export default function TierSettings() {
  const [config, setConfig] = useState(null);
  const [vaultPrice, setVaultPrice] = useState('');
  const [autoAccept, setAutoAccept] = useState(true);
  const [openTier, setOpenTier] = useState(null);
  const [previewTier, setPreviewTier] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get('/portfolio/tier-config').then((res) => {
      setConfig(res.data);
      setVaultPrice(String(res.data.vault_price_cents / 100));
      setAutoAccept(res.data.auto_accept_followers);
    }).catch(() => {});
  }, []);

  const toggleOption = (tier, key) => {
    setConfig((prev) => {
      const list = [...prev[tier]];
      const idx = list.indexOf(key);
      if (idx >= 0) list.splice(idx, 1);
      else list.push(key);
      return { ...prev, [tier]: list };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.put('/portfolio/tier-config', {
        public_shows: config.public_shows,
        inner_circle_shows: config.public_shows,  // same as public now
        vault_shows: config.vault_shows,
        vault_price_cents: Math.round(parseFloat(vaultPrice || '0') * 100),
        auto_accept_followers: autoAccept,
      });
      setMessage('Settings saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Failed to save'); }
    finally { setSaving(false); }
  };

  if (!config) {
    return <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'transparent' }} />
    </div>;
  }

  return (
    <div className="max-w-2xl mx-auto px-4 md:px-6 py-6">
      <div className="flex items-center gap-2 mb-2">
        <Sliders size={20} style={{ color: 'var(--accent)' }} />
        <h1 className="text-2xl font-semibold m-0" style={{ color: 'var(--text-primary)' }}>Tier Settings</h1>
      </div>
      <p className="text-sm mb-5" style={{ color: 'var(--text-secondary)' }}>
        Control what each tier of followers can see. Each tier includes everything from the tiers below it.
      </p>

      {/* Tier accordions */}
      {TIERS.map((tier) => {
        const isOpen = openTier === tier.key;
        const TierIcon = tier.icon;
        const count = config[tier.key]?.length || 0;

        return (
          <div
            key={tier.key}
            className="rounded-xl mb-3 overflow-hidden transition-all"
            style={{ backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}
          >
            {/* Header */}
            <button
              onClick={() => setOpenTier(isOpen ? null : tier.key)}
              className="w-full flex items-center gap-3 px-5 py-4 bg-transparent border-none cursor-pointer text-left"
            >
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: tier.bg }}>
                <TierIcon size={18} style={{ color: tier.color }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>{tier.label}</p>
                <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>
                  {tier.desc} · {count} item{count !== 1 ? 's' : ''} visible
                </p>
              </div>
              {isOpen ? <ChevronDown size={18} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />}
            </button>

            {/* Body */}
            {isOpen && (
              <div className="px-5 pb-5 pt-0" style={{ borderTop: '1px solid var(--border)' }}>
                {/* Preview button */}
                <button
                  onClick={() => setPreviewTier(previewTier === tier.key ? null : tier.key)}
                  className="flex items-center gap-1.5 mt-3 mb-4 text-xs font-medium bg-transparent border-none cursor-pointer"
                  style={{ color: 'var(--accent)' }}
                >
                  <Eye size={13} />
                  {previewTier === tier.key ? 'Hide preview' : 'Preview as follower'}
                </button>

                {/* Preview panel */}
                {previewTier === tier.key && (
                  <div className="rounded-lg p-4 mb-4" style={{ backgroundColor: 'var(--bg-page)', border: '1px dashed var(--border)' }}>
                    <p className="text-[11px] font-medium uppercase tracking-wider mb-2 m-0" style={{ color: 'var(--text-muted)' }}>
                      What {tier.label} followers will see
                    </p>
                    <div className="space-y-1">
                      {config[tier.key]?.length > 0 ? config[tier.key].map((key) => {
                        const item = OPTION_GROUPS.flatMap(g => g.items).find(i => i.key === key);
                        return (
                          <div key={key} className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--success)' }} />
                            <span className="text-xs" style={{ color: 'var(--text-primary)' }}>{item?.label || key}</span>
                          </div>
                        );
                      }) : (
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nothing selected — this tier sees nothing</p>
                      )}
                    </div>
                  </div>
                )}

                {/* Grouped checkboxes */}
                {OPTION_GROUPS.map((group) => {
                  const GroupIcon = group.icon;
                  return (
                    <div key={group.label} className="mb-4 last:mb-0">
                      <div className="flex items-center gap-1.5 mb-2">
                        <GroupIcon size={13} style={{ color: 'var(--text-muted)' }} />
                        <span className="text-[11px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                          {group.label}
                        </span>
                      </div>
                      <div className="space-y-2 ml-5">
                        {group.items.map((opt) => (
                          <label key={opt.key} className="flex items-center gap-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={config[tier.key]?.includes(opt.key) || false}
                              onChange={() => toggleOption(tier.key, opt.key)}
                              className="w-4 h-4 rounded"
                              style={{ accentColor: 'var(--accent)' }}
                            />
                            <span className="text-sm" style={{ color: 'var(--text-primary)' }}>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {/* Per-tier settings */}
                {tier.key === 'public_shows' && (
                  <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                    <label className="flex items-center gap-2.5 cursor-pointer">
                      <input type="checkbox" checked={autoAccept} onChange={(e) => setAutoAccept(e.target.checked)}
                        className="w-4 h-4 rounded" style={{ accentColor: 'var(--accent)' }} />
                      <div>
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>Auto-accept followers</span>
                        <p className="text-xs m-0" style={{ color: 'var(--text-muted)' }}>New followers are automatically approved</p>
                      </div>
                    </label>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}

      {/* Save */}
      <button onClick={handleSave} disabled={saving}
        className="w-full py-2.5 rounded-lg font-semibold text-sm transition-opacity hover:opacity-90 disabled:opacity-50 border-none cursor-pointer mt-2"
        style={{ backgroundColor: 'var(--accent)', color: '#FFFFFF' }}>
        {saving ? 'Saving...' : 'Save Settings'}
      </button>

      {message && (
        <div className="mt-3 rounded-lg px-3 py-2 text-center" style={{ backgroundColor: '#D1FAE5' }}>
          <p className="text-xs m-0" style={{ color: 'var(--success)' }}>{message}</p>
        </div>
      )}
    </div>
  );
}
