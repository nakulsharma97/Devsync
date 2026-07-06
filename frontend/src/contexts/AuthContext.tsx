import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { authService, type AuthResponse } from "@/services/authService";
import { userService, type User } from "@/services/userService";
import { setAuthToken, getAuthToken } from "@/services/api";

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string, username: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const currentUser = await userService.getCurrentUser();
      setUser(currentUser);
    } catch {
      setAuthToken(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    if (response.token) {
      try {
        const currentUser = await userService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        // Token was set but fetching user failed — clean up
        setAuthToken(null);
        throw new Error("Login succeeded but failed to load profile.");
      }
    }
  };

  const register = async (email: string, password: string, fullName: string, username: string) => {
    const response = await authService.register({ email, password, fullName, username });
    if (response.token) {
      try {
        const currentUser = await userService.getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        setAuthToken(null);
        throw new Error("Registration succeeded but failed to load profile.");
      }
    }
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser: fetchUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useDevSyncAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useDevSyncAuth must be used within an AuthProvider");
  }
  return context;
}
