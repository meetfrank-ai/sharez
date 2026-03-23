import { Link } from 'react-router-dom';

export default function HoldingCard({ holding, privacyLevel = 'full' }) {
  const profitLoss = holding.current_value && holding.purchase_value
    ? ((holding.current_value - holding.purchase_value) / holding.purchase_value * 100).toFixed(2)
    : null;

  const isPositive = profitLoss && parseFloat(profitLoss) >= 0;

  return (
    <Link
      to={`/stock/${holding.contract_code}?name=${encodeURIComponent(holding.stock_name)}`}
      className="block no-underline"
    >
      <div
        className="rounded-xl p-4 mb-3 transition-all hover:shadow-md"
        style={{
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xs font-semibold"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {holding.stock_name?.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h3 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                {holding.stock_name}
              </h3>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {holding.account_type}
              </span>
            </div>
          </div>

          <div className="text-right">
            {privacyLevel === 'full' && holding.current_value != null && (
              <>
                <p className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                  R{holding.current_value.toLocaleString()}
                </p>
                {profitLoss && (
                  <p className="text-xs m-0" style={{ color: isPositive ? 'var(--success)' : 'var(--danger)' }}>
                    {isPositive ? '+' : ''}{profitLoss}%
                  </p>
                )}
              </>
            )}
            {privacyLevel === 'percentages' && holding.current_value != null && (
              <p className="text-sm font-semibold m-0" style={{ color: 'var(--accent)' }}>
                {holding.current_value}%
              </p>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
