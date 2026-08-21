import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, render, act, waitFor } from "@testing-library/react";
import { type ReactNode } from "react";
import { SubscriptionProvider, useSubscription } from "./SubscriptionContext";

// Mock billingService
vi.mock("@/services/billingService", () => ({
  billingService: {
    getSubscription: vi.fn(),
  },
}));

import { billingService } from "@/services/billingService";
const mockGetSubscription = vi.mocked(billingService.getSubscription);

const FREE_PLAN = {
  planCode: "FREE",
  planName: "Free",
  priceInr: 0,
  status: "active",
  cancelAtPeriodEnd: false,
};

const PRO_PLAN = {
  planCode: "PRO",
  planName: "Pro",
  priceInr: 29900,
  status: "active",
  provider: "razorpay",
  cancelAtPeriodEnd: false,
};

function createWrapper() {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <SubscriptionProvider>{children}</SubscriptionProvider>;
  };
}

describe("SubscriptionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches subscription on mount", async () => {
    mockGetSubscription.mockResolvedValue(FREE_PLAN);

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    expect(result.current.subscription).toBeNull();

    await waitFor(() => {
      expect(result.current.subscription).toEqual(FREE_PLAN);
    });
  });

  it("refreshSubscription returns fresh data and updates state", async () => {
    mockGetSubscription.mockResolvedValueOnce(FREE_PLAN);

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.subscription?.planCode).toBe("FREE");
    });

    // Simulate upgrade
    mockGetSubscription.mockResolvedValueOnce(PRO_PLAN);

    await act(async () => {
      const fresh = await result.current.refreshSubscription();
      expect(fresh?.planCode).toBe("PRO");
    });

    expect(result.current.subscription?.planCode).toBe("PRO");
  });

  it("multiple consumers share the same state", async () => {
    mockGetSubscription.mockResolvedValue(FREE_PLAN);

    // Use a single render tree so both hooks share one Provider instance
    let consumer1: ReturnType<typeof useSubscription>;
    let consumer2: ReturnType<typeof useSubscription>;

    function MultiConsumer() {
      consumer1 = useSubscription();
      return null;
    }
    function Consumer2() {
      consumer2 = useSubscription();
      return null;
    }

    render(
      <SubscriptionProvider>
        <MultiConsumer />
        <Consumer2 />
      </SubscriptionProvider>
    );

    await waitFor(() => {
      expect(consumer1!.subscription?.planCode).toBe("FREE");
    });
    expect(consumer2!.subscription?.planCode).toBe("FREE");

    // Consumer 1 refreshes
    mockGetSubscription.mockResolvedValueOnce(PRO_PLAN);

    await act(async () => {
      await consumer1!.refreshSubscription();
    });

    // Consumer 2 should now see PRO (shared state)
    await waitFor(() => {
      expect(consumer2!.subscription?.planCode).toBe("PRO");
    });
  });

  it("refreshSubscription returns null on error", async () => {
    mockGetSubscription.mockResolvedValue(FREE_PLAN);

    const { result } = renderHook(() => useSubscription(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.subscription?.planCode).toBe("FREE");
    });

    mockGetSubscription.mockRejectedValueOnce(new Error("network error"));

    await act(async () => {
      const fresh = await result.current.refreshSubscription();
      expect(fresh).toBeNull();
    });

    // Subscription should remain as the last successful value
    expect(result.current.subscription?.planCode).toBe("FREE");
  });
});
