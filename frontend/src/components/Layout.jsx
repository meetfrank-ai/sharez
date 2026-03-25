import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Home,
  BarChart3,
  Compass,
  Bookmark,
  Bell,
  Settings,
  LogOut,
  ArrowLeftRight,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Feed', icon: Home },
  { path: '/portfolio', label: 'My Portfolio', icon: BarChart3 },
  { path: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
  { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/saved', label: 'Saved', icon: Bookmark },
  { path: '/followers', label: 'Connections', icon: Bell },
  { path: '/profile', label: 'Settings', icon: Settings },
];

const mobileNavItems = [
  { path: '/', label: 'Feed', icon: Home },
  { path: '/portfolio', label: 'Portfolio', icon: BarChart3 },
  { path: '/transactions', label: 'Trades', icon: ArrowLeftRight },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/profile', label: 'Profile', icon: Settings },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden">
      {/* Desktop Sidebar — STAK dark */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 z-40"
        style={{ backgroundColor: '#0F0F14', borderRight: '0.5px solid #2a2a35' }}
      >
        {/* Logo */}
        <NavLink to="/" className="block px-5 py-5 no-underline" style={{ borderBottom: '0.5px solid #2a2a35' }}>
          <h1 className="text-lg font-semibold m-0" style={{ color: '#7F77DD' }}>
            Sharez
          </h1>
        </NavLink>

        {/* User info */}
        <div className="px-5 py-4" style={{ borderBottom: '0.5px solid #2a2a35' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #7F77DD, #534AB7)', color: '#fff' }}
            >
              {user?.display_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium m-0 truncate" style={{ color: '#FFFFFF' }}>
                {user?.display_name}
              </p>
              <p className="text-xs m-0 truncate" style={{ color: '#7a7888' }}>
                {user?.handle ? `@${user.handle}` : user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-3">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm no-underline mb-0.5 transition-colors"
                style={{
                  fontWeight: isActive ? 500 : 400,
                  backgroundColor: isActive ? '#1f1a30' : 'transparent',
                  color: isActive ? '#7F77DD' : '#7a7888',
                  borderLeft: isActive ? '3px solid #7F77DD' : '3px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = '#18181f'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Icon size={20} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="px-5 py-4 space-y-1" style={{ borderTop: '0.5px solid #2a2a35' }}>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs bg-transparent border-none cursor-pointer p-0"
            style={{ color: '#4a4958' }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pb-24 md:pb-6 min-w-0 overflow-x-hidden">
        {children}
      </main>

      {/* Mobile bottom tab bar — STAK style */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center z-50"
        style={{
          backgroundColor: '#0F0F14',
          borderTop: '0.5px solid #2a2a35',
          padding: '6px 12px calc(env(safe-area-inset-bottom, 8px) + 6px)',
        }}
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex flex-col items-center no-underline"
              style={{
                padding: isActive ? '6px 14px' : '6px 8px',
                borderRadius: isActive ? 14 : 0,
                backgroundColor: isActive ? '#1f1a30' : 'transparent',
                transition: 'all 150ms ease',
              }}
            >
              <Icon size={21} strokeWidth={isActive ? 2 : 1.5} style={{ color: isActive ? '#7F77DD' : '#4a4958' }} />
              <span style={{
                fontSize: 9,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? '#7F77DD' : '#4a4958',
                marginTop: 2,
              }}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
