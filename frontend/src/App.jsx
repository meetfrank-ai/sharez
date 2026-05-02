import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './app/hooks/useAuth';
import Layout from './app/components/Layout';

// Public / unauthenticated
const Landing = lazy(() => import('./site/Landing'));
const Login = lazy(() => import('./app/pages/Login'));
const ForgotPassword = lazy(() => import('./app/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./app/pages/ResetPassword'));

// Authenticated app pages
const Onboarding = lazy(() => import('./app/pages/Onboarding'));
const Feed = lazy(() => import('./app/pages/Feed'));
const Portfolio = lazy(() => import('./app/pages/Portfolio'));
const StockDetail = lazy(() => import('./app/pages/StockDetail'));
const Profile = lazy(() => import('./app/pages/Profile'));
const Discover = lazy(() => import('./app/pages/Discover'));
const UserProfile = lazy(() => import('./app/pages/UserProfile'));
const TierSettings = lazy(() => import('./app/pages/TierSettings'));
const Followers = lazy(() => import('./app/pages/Followers'));
const Watchlist = lazy(() => import('./app/pages/Watchlist'));
const Transactions = lazy(() => import('./app/pages/Transactions'));
const Saved = lazy(() => import('./app/pages/Saved'));
const NoteThread = lazy(() => import('./app/pages/NoteThread'));
const Settings = lazy(() => import('./app/pages/Settings'));
const LinkAccount = lazy(() => import('./app/pages/LinkAccount'));
const Rank = lazy(() => import('./app/pages/Rank'));
const Pods = lazy(() => import('./app/pages/Pods'));
const PodDetail = lazy(() => import('./app/pages/PodDetail'));

function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div
        className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
        style={{ borderColor: '#E5E7EB', borderTopColor: 'transparent' }}
      />
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

  if (!user) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Suspense>
    );
  }

  if (!user.has_onboarded) {
    return (
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Navigate to="/onboarding" />} />
          <Route path="/login" element={<Navigate to="/onboarding" />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <Onboarding />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/onboarding" />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Navigate to="/app" />} />
        <Route path="/onboarding" element={<Navigate to="/app" />} />
        <Route element={<Layout />}>
          <Route path="/app" element={<Feed />} />
          <Route path="/discover" element={<Discover />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/watchlist" element={<Watchlist />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/stock/:contractCode" element={<StockDetail />} />
          <Route path="/user/:userId" element={<UserProfile />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/tier-settings" element={<TierSettings />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/link-account" element={<LinkAccount />} />
          <Route path="/rank" element={<Rank />} />
          <Route path="/pods" element={<Pods />} />
          <Route path="/pods/:slug" element={<PodDetail />} />
          <Route path="/followers" element={<Followers />} />
          <Route path="/note/:noteId" element={<NoteThread />} />
        </Route>
        <Route path="*" element={<Navigate to="/app" />} />
      </Routes>
    </Suspense>
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
