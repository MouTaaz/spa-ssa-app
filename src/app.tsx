import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { HomePage } from "@/pages/home";
import { AppointmentsPage } from "@/pages/appointments";
import { LoginForm } from "@/components/auth/login-form";
import { SignupForm } from "@/components/auth/signup-form";
import { EmailVerificationScreen } from "@/components/auth/email-verification-screen";
import { useAuth } from "@/hooks/useAuth";
import { useBusiness } from "@/hooks/useBusiness";
import { useSubscription } from "@/hooks/useSubscription";
import { Header } from "@/components/layout/header";
import { ProfilePage } from "@/pages/profile";
import { SettingsPage } from "@/pages/settings";
import { SubscribePage } from "@/pages/subscribe";
import { AdminPanel } from "@/pages/admin";
import { OfflineBanner } from "@/components/offline/offline-banner";
import { MobileNav } from "@/components/mobile/mobile-nav";
import { InstallPrompt } from "@/components/mobile/install-prompt";
import { MigrationRequired } from "@/components/MigrationRequired";
import { OnboardingManager } from "@/components/onboarding/OnboardingManager";
import { initializeDB } from "@/lib/offline-storage";
import { initializeOneSignal } from "@/lib/notifications";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const {
    currentBusiness,
    loading: businessLoading,
    error: businessError,
  } = useBusiness();
  const { limits } = useSubscription();

  if (loading || businessLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-900">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-300">Loading...</p>
        </div>
      </div>
    );
  }

  // Show migration required screen if business loading failed due to missing tables or RLS issues
  if (
    businessError?.includes("migration") ||
    businessError?.includes("infinite recursion")
  ) {
    return <MigrationRequired />;
  }

  // Check subscription status - redirect to subscribe page if not active
  // Only check after business is fully loaded and has a status
  if (
    currentBusiness &&
    currentBusiness.subscription_status &&
    currentBusiness.subscription_status !== "active"
  ) {
    return <Navigate to="/subscribe" replace />;
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

export function App() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { user } = useAuth();
  const { currentBusiness } = useBusiness();

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize IndexedDB
        await initializeDB();

        // Register Service Worker in production only
        if ("serviceWorker" in navigator && import.meta.env.PROD) {
          try {
            await navigator.serviceWorker.register("/sw.js", {
              scope: "/",
            });
            console.log("Service Worker registered successfully");

            // Initialize OneSignal after service worker is registered
            await initializeOneSignal(user?.id);
          } catch (error) {
            console.log("SW registration failed: ", error);
          }
        }
      } catch (error) {
        console.error("App initialization failed:", error);
      }
    };

    // Online/Offline listeners
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    initializeApp();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main>
          <Routes>
            <Route index element={<HomePage />} />
            <Route path="login" element={<LoginForm />} />
            <Route path="signup" element={<SignupForm />} />
            <Route path="verify-email" element={<EmailVerificationScreen />} />

            <Route
              path="appointments"
              element={
                <ProtectedRoute>
                  <AppointmentsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings"
              element={
                <ProtectedRoute>
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route path="subscribe" element={<SubscribePage />} />
            <Route path="admin" element={<AdminPanel />} />
            <Route
              path="onboarding-success"
              element={
                <ProtectedRoute>
                  <OnboardingManager />
                </ProtectedRoute>
              }
            />
            {/* Catch all route - fix for params error */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        {!isOnline && <OfflineBanner />}
        <MobileNav />
        <InstallPrompt />
      </div>
    </BrowserRouter>
  );
}
