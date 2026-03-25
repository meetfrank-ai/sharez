import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Layout from './components/Layout';

// Lazy-load all pages for code splitting
const Login = lazy(() => import('./pages/Login'));
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Feed = lazy(() => import('./pages/Feed'));
const Portfolio = lazy(() => import('./pages/Portfolio'));
const StockDetail = lazy(() => import('./pages/StockDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Discover = lazy(() => import('./pages/Discover'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const TierSettings = lazy(() => import('./pages/TierSettings'));
const Followers = lazy(() => import('./pages/Followers'));
const Watchlist = lazy(() => import('./pages/Watchlist'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Saved = lazy(() => import('./pages/Saved'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const NoteThread = lazy(() => import('./pages/NoteThread'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: '#E5E7EB', borderTopColor: 'transparent' }} />
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user, loading } = useAuth();
  if (loading) return null;

  if (!user || !user.has_onboarded) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={user ? <Navigate to={user.has_onboarded ? '/' : '/onboarding'} /> : <Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={
            <ProtectedRoute>
              {user?.has_onboarded ? <Navigate to="/" /> : <Onboarding />}
            </ProtectedRoute>
          } />
          <Route path="*" element={<Navigate to={user ? '/onboarding' : '/login'} />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Layout>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Navigate to="/" />} />
          <Route path="/onboarding" element={<Navigate to="/" />} />
          <Route path="/" element={<Feed />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/stock/:contractCode" element={<StockDetail />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tier-settings" element={<TierSettings />} />
          <Route path="/followers" element={<Followers />} />
          <Route path="/note/:noteId" element={<NoteThread />} />
        </Routes>
      </Suspense>
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
