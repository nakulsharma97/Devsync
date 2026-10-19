import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { Navigate } from "react-router";

/**
 * Guards the USER application shell.
 *
 * - While auth is loading, shows a loader (no flash of protected content).
 * - Unauthenticated users are sent to /auth.
 * - ADMIN accounts are confined to the Admin Panel and sent to
 *   /admin/dashboard. Their role is their destination: the backend rejects
 *   ADMIN requests to the user-app API namespaces (see SecurityConfig), so
 *   rendering the user shell for them would only produce 403s.
 * - Normal USER accounts see the wrapped content.
 *
 * This is UX-only protection; the backend remains the source of truth.
 */
export function UserRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isAdmin, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (isAdmin) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  return <>{children}</>;
}
