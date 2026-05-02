import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Home, BarChart3, Compass, Bookmark, Bell, Settings, LogOut, ArrowLeftRight, Layers } from 'lucide-react';
import NotificationsBell from './NotificationsBell';
import FriendsPanel from './FriendsPanel';

const navItems = [
  { path: '/app', label: 'Feed', icon: Home },
  { path: '/portfolio', label: 'Portfolio', icon: BarChart3 },
  { path: '/transactions', label: 'Transactions', icon: Layers },
  { path: '/watchlist', label: 'Watchlist', icon: Bookmark },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/saved', label: 'Saved', icon: Bookmark },
  { path: '/followers', label: 'Connections', icon: Bell },
  { path: '/profile', label: 'Profile', icon: Settings },
  { path: '/settings', label: 'Settings', icon: Settings },
];

const mobileNavItems = [
  { path: '/app', label: 'Feed', icon: Home },
  { path: '/portfolio', label: 'Portfolio', icon: BarChart3 },
  { path: '/transactions', label: 'Trades', icon: Layers },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/profile', label: 'Profile', icon: Settings },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen w-full overflow-x-hidden" style={{ backgroundColor: '#F6F7FB' }}>
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col fixed z-40"
        style={{
          top: 20, bottom: 20, left: 20, width: 264,
          backgroundColor: '#FFFFFF',
          border: '1px solid #E6E9F2',
          borderRadius: 20,
        }}
      >
        <NavLink to="/app" className="block px-6 py-6 no-underline" style={{ borderBottom: '1px solid #E6E9F2' }}>
          <h1 className="m-0" style={{ fontSize: 22, fontWeight: 600, color: '#7C5CE0', fontFamily: "'Inter', -apple-system, sans-serif", letterSpacing: '-0.01em' }}>
            Sharez
          </h1>
        </NavLink>

        <div className="px-6 py-5" style={{ borderBottom: '1px solid #E6E9F2' }}>
          <div className="flex items-center gap-3">
            <div className="shrink-0 flex items-center justify-center"
              style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#F0EEFF', color: '#7C5CE0', fontSize: 16, fontWeight: 700 }}>
              {user?.display_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="m-0 truncate" style={{ fontSize: 14, fontWeight: 500, color: '#111318' }}>{user?.display_name}</p>
              <p className="m-0 truncate" style={{ fontSize: 12, fontWeight: 400, color: '#9AA1AC' }}>{user?.handle ? `@${user.handle}` : user?.email}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 px-4 py-5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink key={item.path} to={item.path}
                className="flex items-center gap-3 no-underline"
                style={{
                  padding: '12px 14px', marginBottom: 6,
                  borderRadius: 12, fontSize: 15, fontWeight: isActive ? 500 : 400,
                  backgroundColor: isActive ? '#F0EEFF' : 'transparent',
                  color: isActive ? '#7C5CE0' : '#6B7280',
                  transition: 'all 150ms ease',
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.backgroundColor = '#F6F7FB'; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}>
                <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        <div className="px-6 py-5" style={{ borderTop: '1px solid #E6E9F2' }}>
          <button onClick={logout}
            className="flex items-center gap-2 bg-transparent border-none cursor-pointer p-0"
            style={{ fontSize: 13, fontWeight: 500, color: '#9AA1AC' }}>
            <LogOut size={14} /> Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 pb-28 md:pb-6 md:ml-[304px] xl:mr-[320px] min-w-0 overflow-x-hidden">
        {/* Top bar with bell */}
        <div className="flex justify-end items-center gap-2 px-4 md:px-6 pt-4">
          <NotificationsBell />
        </div>
        <Outlet />
      </main>

      {/* Right rail (xl+) */}
      <FriendsPanel />

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex justify-around items-center z-50"
        style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E6E9F2', padding: '8px 20px calc(env(safe-area-inset-bottom, 8px) + 8px)' }}>
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink key={item.path} to={item.path}
              className="flex flex-col items-center no-underline" style={{ gap: 4 }}>
              {isActive ? (
                <div className="flex items-center justify-center"
                  style={{ width: 40, height: 40, borderRadius: '50%', backgroundColor: '#7C5CE0' }}>
                  <Icon size={20} strokeWidth={2} style={{ color: '#FFFFFF' }} />
                </div>
              ) : (
                <Icon size={22} strokeWidth={1.5} style={{ color: '#CCCCCC' }} />
              )}
              <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 500, color: isActive ? '#7C5CE0' : '#CCCCCC' }}>
                {item.label}
              </span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
