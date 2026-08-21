import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { billingService, type SubscriptionInfo } from "@/services/billingService";

interface SubscriptionContextType {
  subscription: SubscriptionInfo | null;
  /** Re-fetch subscription from the API. Returns the fresh value. */
  refreshSubscription: () => Promise<SubscriptionInfo | null>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

/**
 * Provides a single source of truth for the user's subscription plan.
 *
 * Previously DashboardLayout and Billing each fetched subscription into
 * their own local state — after a successful upgrade the Billing page
 * refreshed its local copy but DashboardLayout's badge was stale until
 * a full page reload. This provider lives at the authenticated shell
 * level so every consumer shares one state.
 */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);

  const refreshSubscription = useCallback(async (): Promise<SubscriptionInfo | null> => {
    try {
      const sub = await billingService.getSubscription();
      setSubscription(sub);
      return sub;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const value = useMemo(() => ({ subscription, refreshSubscription }), [subscription, refreshSubscription]);

  return <SubscriptionContext.Provider value={value}>{children}</SubscriptionContext.Provider>;
}

export function useSubscription(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) throw new Error("useSubscription must be used within SubscriptionProvider");
  return ctx;
}
