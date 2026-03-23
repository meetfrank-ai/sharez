import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const navItems = [
  { path: '/', label: 'Feed', icon: '📡' },
  { path: '/discover', label: 'Discover', icon: '🔍' },
  { path: '/portfolio', label: 'Portfolio', icon: '📊' },
  { path: '/profile', label: 'Profile', icon: '⚙️' },
];

export default function NavBar() {
  const { pathname } = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
         style={{ backgroundColor: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
      <div className="max-w-lg mx-auto flex justify-around py-2">
        {navItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className={`flex flex-col items-center py-1 px-3 text-xs no-underline transition-colors ${
              pathname === item.path ? 'opacity-100' : 'opacity-50'
            }`}
            style={{ color: pathname === item.path ? 'var(--gold)' : 'var(--text-secondary)' }}
          >
            <span className="text-lg mb-0.5">{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
