import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { UserProvider } from "@/context/UserContext";
import { SessionProvider } from "@/context/SessionContext";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { OfflineBanner } from "@/components/OfflineBanner";
import { VerificationBanner } from "@/components/VerificationBanner";
import { useEffect } from "react";
import Index from "./pages/Index";
import FocusSession from "./pages/FocusSession";
import Garden from "./pages/Garden";
import Arena from "./pages/Arena";
import Profile from "./pages/Profile";
import Analytics from "./pages/Analytics";
import Store from "./pages/Store";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Welcome from "./pages/Welcome";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import VerifyEmail from "./pages/VerifyEmail";
import TransactionHistory from "./pages/TransactionHistory";
import AdminPanel from "./pages/AdminPanel";

const queryClient = new QueryClient();

function ThemeApplier() {
  const { authUser } = useAuth();
  useEffect(() => {
    const isNight = authUser?.studyMode === "night";
    document.documentElement.classList.toggle("dark", isNight);
  }, [authUser?.studyMode]);
  return null;
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return (
    <UserProvider>
      <ErrorBoundary>
        {children}
      </ErrorBoundary>
    </UserProvider>
  );
}

function AppRoutes() {
  const { isAuthenticated, isLoading } = useAuth();
  const hasOnboarded = localStorage.getItem("focusoura_onboarded") === "true";

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--color-background)] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[var(--color-primary)] border-t-transparent animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route
        path="/welcome"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : <Welcome />
        }
      />
      <Route
        path="/login"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : <Login />
        }
      />
      <Route
        path="/register"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : <Register />
        }
      />
      <Route
        path="/forgot-password"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : <ForgotPassword />
        }
      />
      <Route
        path="/reset-password"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : <ResetPassword />
        }
      />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Index />
          </ProtectedRoute>
        }
      />
      <Route
        path="/focus"
        element={
          <ProtectedRoute>
            <FocusSession />
          </ProtectedRoute>
        }
      />
      <Route
        path="/garden"
        element={
          <ProtectedRoute>
            <Garden />
          </ProtectedRoute>
        }
      />
      <Route
        path="/arena"
        element={
          <ProtectedRoute>
            <Arena />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        }
      />
      <Route
        path="/analytics"
        element={
          <ProtectedRoute>
            <Analytics />
          </ProtectedRoute>
        }
      />
      <Route
        path="/store"
        element={
          <ProtectedRoute>
            <Store />
          </ProtectedRoute>
        }
      />
      <Route
        path="/wallet/transactions"
        element={
          <ProtectedRoute>
            <TransactionHistory />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route
        path="*"
        element={
          isAuthenticated
            ? <Navigate to="/" replace />
            : hasOnboarded
              ? <Navigate to="/login" replace />
              : <Navigate to="/welcome" replace />
        }
      />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <AuthProvider>
          <ThemeApplier />
          <OfflineBanner />
          <VerificationBanner />
          <SessionProvider>
            <AppRoutes />
          </SessionProvider>
        </AuthProvider>
      </BrowserRouter>
      <Toaster />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
