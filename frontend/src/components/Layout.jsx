import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import {
  Home,
  BarChart3,
  Compass,
  StickyNote,
  Bell,
  Settings,
  HelpCircle,
  Info,
  LogOut,
} from 'lucide-react';

const navItems = [
  { path: '/', label: 'Feed', icon: Home },
  { path: '/portfolio', label: 'My Portfolio', icon: BarChart3 },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/followers', label: 'Connections', icon: Bell },
  { path: '/profile', label: 'Settings', icon: Settings },
];

const mobileNavItems = [
  { path: '/', label: 'Feed', icon: Home },
  { path: '/portfolio', label: 'Portfolio', icon: BarChart3 },
  { path: '/discover', label: 'Discover', icon: Compass },
  { path: '/followers', label: 'Network', icon: Bell },
  { path: '/profile', label: 'Profile', icon: Settings },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  return (
    <div className="flex min-h-screen">
      {/* Desktop Sidebar */}
      <aside
        className="hidden md:flex flex-col fixed left-0 top-0 bottom-0 w-60 border-r z-40"
        style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--border)' }}>
          <h1 className="text-lg font-semibold m-0" style={{ color: 'var(--accent)' }}>
            Sharez
          </h1>
        </div>

        {/* User info */}
        <div className="px-5 py-4 border-b" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold"
              style={{ backgroundColor: 'var(--accent-light)', color: 'var(--accent)' }}
            >
              {user?.display_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold m-0 truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.display_name}
              </p>
              <p className="text-xs m-0 truncate" style={{ color: 'var(--text-muted)' }}>
                {user?.email}
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
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium no-underline mb-0.5 transition-colors"
                style={{
                  backgroundColor: isActive ? 'var(--accent-light)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                  borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-hover)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Icon size={20} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom links */}
        <div className="px-5 py-4 border-t space-y-1" style={{ borderColor: 'var(--border)' }}>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs bg-transparent border-none cursor-pointer p-0"
            style={{ color: 'var(--text-muted)' }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-60 pb-20 md:pb-6">
        {children}
      </main>

      {/* Mobile bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 border-t flex z-50"
        style={{ backgroundColor: 'var(--bg-sidebar)', borderColor: 'var(--border)' }}
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className="flex-1 flex flex-col items-center py-2 text-[10px] no-underline transition-colors"
              style={{
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <Icon size={20} />
              <span className="mt-0.5">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
}
