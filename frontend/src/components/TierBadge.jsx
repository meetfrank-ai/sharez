const tierStyles = {
  public: { bg: '#F3F4F6', text: '#6B7280', label: 'Public' },
  inner_circle: { bg: '#EFF6FF', text: '#3B82F6', label: 'Inner Circle' },
  vault: { bg: '#FFFBEB', text: '#D97706', label: 'Vault' },
};

export default function TierBadge({ tier }) {
  const style = tierStyles[tier] || tierStyles.public;

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {style.label}
    </span>
  );
}
