import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Feed from './pages/Feed';
import Portfolio from './pages/Portfolio';
import StockDetail from './pages/StockDetail';
import Profile from './pages/Profile';
import Discover from './pages/Discover';
import UserProfile from './pages/UserProfile';
import TierSettings from './pages/TierSettings';
import Followers from './pages/Followers';
import Watchlist from './pages/Watchlist';
import Transactions from './pages/Transactions';
import NoteThread from './pages/NoteThread';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  // Not logged in or onboarding — no layout
  if (!user || !user.has_onboarded) {
    return (
      <Routes>
        <Route path="/login" element={user ? <Navigate to={user.has_onboarded ? '/' : '/onboarding'} /> : <Login />} />
        <Route path="/onboarding" element={
          <ProtectedRoute>
            {user?.has_onboarded ? <Navigate to="/" /> : <Onboarding />}
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to={user ? '/onboarding' : '/login'} />} />
      </Routes>
    );
  }

  // Logged in and onboarded — full layout
  return (
    <Layout>
      <Routes>
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="/onboarding" element={<Navigate to="/" />} />
        <Route path="/" element={<Feed />} />
        <Route path="/discover" element={<Discover />} />
        <Route path="/portfolio" element={<Portfolio />} />
        <Route path="/watchlist" element={<Watchlist />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/stock/:contractCode" element={<StockDetail />} />
        <Route path="/user/:userId" element={<UserProfile />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/tier-settings" element={<TierSettings />} />
        <Route path="/followers" element={<Followers />} />
        <Route path="/note/:noteId" element={<NoteThread />} />
      </Routes>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
