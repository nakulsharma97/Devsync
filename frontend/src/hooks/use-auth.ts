/**
 * This hook re-exports useAuth from AuthContext so that both
 * import paths resolve to the same auth provider:
 *   import { useAuth } from "@/hooks/use-auth"
 *   import { useAuth } from "@/contexts/AuthContext"
 *
 * Previously, this file used @convex-dev/auth/react which was
 * a separate auth mechanism causing user to always be null.
 */
export { useAuth, useDevSyncAuth } from "@/contexts/AuthContext";
