import { Navigate } from "react-router";
import { useDevSyncAuth } from "@/contexts/AuthContext";
import { getAuthToken } from "@/services/api";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useDevSyncAuth();
  const token = getAuthToken();

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
