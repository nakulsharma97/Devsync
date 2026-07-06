import { useAuthActions } from "@convex-dev/auth/react";
import { useConvexAuth } from "convex/react";

export function useAuth() {
  const { isLoading: isAuthLoading, isAuthenticated } = useConvexAuth();
  const { signIn, signOut } = useAuthActions();

  return {
    isLoading: isAuthLoading,
    isAuthenticated,
    user: null as any,
    signIn,
    signOut,
  };
}
