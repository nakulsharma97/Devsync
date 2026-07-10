import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { authService, type AuthResponse } from "@/services/authService";
import { wsService } from "@/services/websocketService";

interface AuthContextType {
  user: AuthResponse["user"] | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, username?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthResponse["user"] | null>(() => authService.getStoredUser());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUser = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(null);
      setIsLoading(false);
      wsService.disconnect();
      return;
    }
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
      // Connect WebSocket for real-time messaging
      wsService.connect(user.id, token);
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

  const login = useCallback(async (email: string, password: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authService.login(email, password);
      authService.saveSession(response);
      setUser(response.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Login failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, fullName: string, username?: string) => {
    setError(null);
    setIsLoading(true);
    try {
      const response = await authService.register({ email, password, fullName, username });
      authService.saveSession(response);
      setUser(response.user);
      window.location.href = "/dashboard";
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Registration failed");
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    authService.clearSession();
    setUser(null);
    wsService.disconnect();
    window.location.href = "/";
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        error,
        login,
        register,
        logout,
        refreshUser,
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

// Re-export for backwards compatibility
export const useDevSyncAuth = useAuth;
