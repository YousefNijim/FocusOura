import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { setToken, clearToken, getToken } from "@/utils/api";

export type AuthUser = {
  id: string;
  userCode: number | null;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
  authProvider: string;
  studyMode: string;
  notificationsEnabled: boolean;
  onboardingCompleted: boolean;
  emailVerified: boolean;
  createdAt: string;
};

type AuthContextType = {
  token: string | null;
  authUser: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (displayName: string, email: string, password: string, role?: string) => Promise<void>;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => void;
  updateAuthUser: (updates: Partial<AuthUser>) => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_CACHE_KEY = "focusoura_user_cache";

function getCachedUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setCachedUser(user: AuthUser) {
  localStorage.setItem(USER_CACHE_KEY, JSON.stringify(user));
}

function clearCachedUser() {
  localStorage.removeItem(USER_CACHE_KEY);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = getToken();
    if (savedToken) {
      setTokenState(savedToken);

      const cached = getCachedUser();
      if (cached) {
        setAuthUser(cached);
        setIsLoading(false);
        verifyTokenSilently(savedToken);
      } else {
        verifyToken(savedToken).finally(() => setIsLoading(false));
      }
    } else {
      setIsLoading(false);
    }
  }, []);

  async function verifyToken(t: string) {
    try {
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const user = await res.json();
        setAuthUser(user);
        setCachedUser(user);
      } else if (res.status === 401) {
        clearToken();
        clearCachedUser();
        setTokenState(null);
        setAuthUser(null);
      }
    } catch {
      // Network error — keep the user logged in with cached data
    }
  }

  async function verifyTokenSilently(t: string) {
    try {
      const res = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const user = await res.json();
        setAuthUser(user);
        setCachedUser(user);
      } else if (res.status === 401) {
        clearToken();
        clearCachedUser();
        setTokenState(null);
        setAuthUser(null);
      }
    } catch {
      // Network error — silently ignore, user stays logged in
    }
  }

  async function handleAuthResponse(data: { token: string; user: AuthUser }) {
    setToken(data.token);
    setTokenState(data.token);
    setAuthUser(data.user);
    setCachedUser(data.user);
  }

  async function login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Login failed");
    await handleAuthResponse(data);
  }

  async function register(displayName: string, email: string, password: string, role = "student") {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ displayName, email, password, role }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Registration failed");
    await handleAuthResponse(data);
  }

  async function loginWithGoogle(credential: string) {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Google login failed");
    await handleAuthResponse(data);
  }

  function logout() {
    clearToken();
    clearCachedUser();
    setTokenState(null);
    setAuthUser(null);
  }

  function updateAuthUser(updates: Partial<AuthUser>) {
    setAuthUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      setCachedUser(updated);
      return updated;
    });
  }

  return (
    <AuthContext.Provider
      value={{
        token,
        authUser,
        isAuthenticated: !!token && !!authUser,
        isLoading,
        login,
        register,
        loginWithGoogle,
        logout,
        updateAuthUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
