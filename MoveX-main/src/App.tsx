import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import ScrollProgressBar from './components/ScrollProgressBar';
import BackToTop from './components/BackToTop';
import FloatingContact from './components/FloatingContact';
import CookieConsent from './components/CookieConsent';
import { captureUTMParameters } from './utils/utm';

// Lazy-loaded routes for optimal bundle chunking and performance
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AuthPage = lazy(() => import('./pages/AuthPage'));
const HowItWorksPage = lazy(() => import('./pages/HowItWorksPage'));
const SafetyPage = lazy(() => import('./pages/SafetyPage'));
const TrackParcelPage = lazy(() => import('./pages/TrackParcelPage'));
const SenderDashboard = lazy(() => import('./pages/SenderDashboard'));
const PartnerDashboard = lazy(() => import('./pages/PartnerDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const ThankYouPage = lazy(() => import('./pages/ThankYouPage'));

function RequireAuth({
  children,
  adminOnly = false
}: {
  children: React.ReactNode;
  adminOnly?: boolean;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-sm text-[#777777] dark:text-neutral-400">
        <div className="animate-pulse">Loading MOVEX workspace...</div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/auth" replace />;
  }
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/sender" replace />;
  }
  return <>{children}</>;
}

function PageFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-3 border-[#FFD43B] border-t-transparent" />
    </div>
  );
}

function AppRoutes() {
  useEffect(() => {
    // Capture any incoming campaign UTM query parameters
    captureUTMParameters();
  }, []);

  return (
    <div className="min-h-screen bg-white dark:bg-[#101114] text-[#101114] dark:text-neutral-100 flex flex-col transition-colors">
      {/* Feature 43: Accessible Skip to Content Link */}
      <a href="#main-content" className="sr-only">
        Skip to main content
      </a>

      {/* Feature 17: Scroll Progress Bar */}
      <ScrollProgressBar />

      {/* Feature 13 & 14: Sticky Navbar with Mobile Drawer */}
      <Navbar />

      {/* Main Content Area */}
      <div className="flex-1">
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/how-it-works" element={<HowItWorksPage />} />
            <Route path="/safety" element={<SafetyPage />} />
            <Route path="/track" element={<TrackParcelPage />} />
            <Route path="/track/:code" element={<TrackParcelPage />} />
            <Route path="/privacy" element={<PrivacyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/thank-you" element={<ThankYouPage />} />
            <Route
              path="/sender"
              element={
                <RequireAuth>
                  <SenderDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/partner"
              element={
                <RequireAuth>
                  <PartnerDashboard />
                </RequireAuth>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAuth adminOnly>
                  <AdminDashboard />
                </RequireAuth>
              }
            />
            {/* Feature 1: Custom 404 Route */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </div>

      {/* Feature 16: Back to Top Button */}
      <BackToTop />

      {/* Feature 24: Floating Support Button */}
      <FloatingContact />

      {/* Feature 38: Cookie Consent Banner */}
      <CookieConsent />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
