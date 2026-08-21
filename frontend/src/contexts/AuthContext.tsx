import { createContext, useContext, useState, useCallback, useEffect, useMemo, type ReactNode } from "react";
import { authService, type AuthResponse } from "@/services/authService";
import { wsService } from "@/services/websocketService";
import { getErrorMessage } from "@/lib/utils";
import api from "@/services/api";

interface AuthContextType {
  user: AuthResponse["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  /** True only when the authenticated user has the ADMIN role. */
  isAdmin: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  forgotPassword: (email: string) => Promise<void>;
  loginWithOAuth: (provider: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse["user"] | null>(() => authService.getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const forgotPassword = useCallback(async (email: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.forgotPassword(email);
    } catch (err) {
      setError(getErrorMessage(err, "Failed to send reset link"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loginWithOAuth = useCallback(async (provider: string) => {
    setError(null);
    setIsLoading(true);
    try {
      await authService.loginWithOAuth(provider);
    } catch (err) {
      setError(getErrorMessage(err, "OAuth login failed"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const userData = await authService.getMe();
      const user = {
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName,
        username: userData.username,
        avatarUrl: userData.avatarUrl,
        role: userData.role,
      };
      setUser(user);
      // Fetch a short-lived WebSocket auth token (cookies can't be sent with WS)
      try {
        const wsTokenRes = await api.get("/auth/ws-token");
        wsService.connect(user.id, wsTokenRes.data.accessToken);
      } catch {
        // WebSocket auth token fetch failed — messaging won't work but app still functions
        console.warn("Could not fetch WebSocket auth token");
      }
    } catch {
      authService.clearSession();
      setUser(null);
      wsService.disconnect();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  // If the backend signals that our cached role/authorization is stale (e.g. an admin
  // was downgraded or blocked while logged in), re-fetch the authoritative profile.
  // refreshUser() either updates the role from the server or clears the session.
  useEffect(() => {
    const handleAuthorizationChanged = () => {
      refreshUser();
    };
    window.addEventListener("auth:authorization-changed", handleAuthorizationChanged);
    return () => window.removeEventListener("auth:authorization-changed", handleAuthorizationChanged);
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      authService.saveSession(response);
      setUser(response.user);
      // Role-aware redirect is handled by Auth.tsx useEffect — do NOT
      // hardcode window.location.href here, as that forces a full page
      // reload before React can evaluate the user's role.
    } catch (err) {
      setError(getErrorMessage(err, "Login failed"));
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    // Revoke the refresh token server-side (and clear the cookie) before
    // dropping the local session — a stolen refresh token must not outlive logout.
    authService.logout().catch(() => {});
    authService.clearSession();
    setUser(null);
    wsService.disconnect();
    window.location.href = "/";
  }, []);

  // Memoized so consumers only re-render when auth state actually changes
  // (the callback identities are stable via useCallback above).
  const value = useMemo(
    () => ({
      user,
      isLoading,
      isAuthenticated: !!user,
      isAdmin: user?.role === "ADMIN",
      error,
      login,
      logout,
      clearError,
      forgotPassword,
      loginWithOAuth,
      refreshUser,
    }),
    [
      user,
      isLoading,
      error,
      login,
      logout,
      clearError,
      forgotPassword,
      loginWithOAuth,
      refreshUser,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

// Re-export for backwards compatibility
export const useDevSyncAuth = useAuth;
