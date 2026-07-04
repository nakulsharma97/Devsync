import { Navigate } from "react-router";
import { useDevSyncAuth } from "@/contexts/AuthContext";
import { useAuth } from "@/hooks/use-auth";
import { getAuthToken } from "@/services/api";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated: isDevSyncAuth, isLoading: isDevSyncLoading } = useDevSyncAuth();
  const { isAuthenticated: isConvexAuth, isLoading: isConvexLoading } = useAuth();
  const token = getAuthToken();

  const isLoading = isDevSyncLoading || isConvexLoading;
  const isAuthenticated = isDevSyncAuth || isConvexAuth || !!token;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated && !token) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
