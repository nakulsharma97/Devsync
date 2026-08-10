import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router";

/**
 * Guards admin pages.
 *
 * - While auth is loading, shows a loader (no flash of content).
 * - Unauthenticated users are sent to /auth.
 * - Authenticated non-admin users are sent to /dashboard.
 * - Only users with the ADMIN role see the wrapped content.
 *
 * This is UX-only protection: the backend enforces /api/admin/** with
 * hasRole("ADMIN") and remains the source of truth.
 */
export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
