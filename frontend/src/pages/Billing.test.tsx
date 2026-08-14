import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { Toaster } from "@/components/ui/sonner";
import Billing from "./Billing";

const mocks = vi.hoisted(() => ({
  getPlans: vi.fn(),
  getSubscription: vi.fn(),
  getUsage: vi.fn(),
  getPayments: vi.fn(),
  createCheckout: vi.fn(),
  cancelSubscription: vi.fn(),
}));

vi.mock("@/services/billingService", () => ({
  billingService: {
    getPlans: mocks.getPlans,
    getSubscription: mocks.getSubscription,
    getUsage: mocks.getUsage,
    getPayments: mocks.getPayments,
    createCheckout: mocks.createCheckout,
    cancelSubscription: mocks.cancelSubscription,
  },
}));

const plans = [
  { code: "FREE", name: "Free", description: "Start collaborating.", priceInr: 0, currency: "INR", privateProjectLimit: 2, membersPerProject: 5, storageBytes: 1073741824, advancedAnalytics: false, customDomain: false, sso: false, auditLevel: "BASIC", prioritySupport: false },
  { code: "PRO", name: "Pro", description: "More power.", priceInr: 299, currency: "INR", privateProjectLimit: 20, membersPerProject: 25, storageBytes: 53687091200, advancedAnalytics: true, customDomain: false, sso: false, auditLevel: "FULL", prioritySupport: true },
  { code: "ENTERPRISE", name: "Enterprise", description: "Unlimited scale.", priceInr: 999, currency: "INR", privateProjectLimit: null, membersPerProject: 100, storageBytes: 268435456000, advancedAnalytics: true, customDomain: false, sso: false, auditLevel: "ADVANCED", prioritySupport: true },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Billing />
      <Toaster />
    </MemoryRouter>
  );
}

describe("Billing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getPlans.mockResolvedValue(plans);
    mocks.getSubscription.mockResolvedValue({
      planCode: "FREE",
      planName: "Free",
      priceInr: 0,
      status: "FREE",
      cancelAtPeriodEnd: false,
    });
    mocks.getUsage.mockResolvedValue({
      planCode: "FREE",
      planName: "Free",
      privateProjects: { used: 1, limit: 2 },
      storage: { usedBytes: 1024 * 1024, limitBytes: 1073741824 },
      members: { maxInOwnedProject: 2, limit: 5 },
      advancedAnalytics: false,
    });
    mocks.getPayments.mockResolvedValue([]);
    // @ts-expect-error tests stub the global checkout object
    window.Razorpay = class {
      options: { handler: () => void };
      constructor(options: { handler: () => void }) {
        this.options = options;
      }
      open() {
        this.options.handler();
      }
    };
  });

  it("renders real plan pricing from the backend", async () => {
    renderPage();

    expect(await screen.findByText("₹0")).toBeInTheDocument();
    expect(screen.getByText("₹299")).toBeInTheDocument();
    expect(screen.getByText("₹999")).toBeInTheDocument();
    expect(screen.getByText("Most Popular")).toBeInTheDocument();
    expect(screen.getByText("2 private projects")).toBeInTheDocument();
    expect(screen.getByText("Current plan")).toBeInTheDocument();
  });

  it("shows usage bars and an honest empty payment history", async () => {
    renderPage();

    expect(await screen.findByText("Private projects")).toBeInTheDocument();
    expect(screen.getByText("No payments yet. Upgrading to Pro or Enterprise records your history here.")).toBeInTheDocument();
  });

  it("starts checkout for Pro and confirms after the simulated payment", async () => {
    mocks.createCheckout.mockResolvedValue({
      orderId: "order_1",
      amountPaise: 29900,
      currency: "INR",
      keyId: "rzp_test",
      planCode: "PRO",
      planName: "Pro",
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("₹299");

    await user.click(screen.getByRole("button", { name: /upgrade to pro/i }));

    await waitFor(() => {
      expect(mocks.createCheckout).toHaveBeenCalledWith("PRO");
    });
    expect(await screen.findByText(/payment received — activating your plan/i)).toBeInTheDocument();
  });

  it("cancels the subscription with confirmation", async () => {
    mocks.getSubscription.mockResolvedValue({
      planCode: "PRO",
      planName: "Pro",
      priceInr: 299,
      status: "ACTIVE",
      currentPeriodEnd: "2026-08-31T00:00:00Z",
      cancelAtPeriodEnd: false,
    });
    mocks.cancelSubscription.mockResolvedValue({
      planCode: "PRO",
      planName: "Pro",
      priceInr: 299,
      status: "ACTIVE",
      currentPeriodEnd: "2026-08-31T00:00:00Z",
      cancelAtPeriodEnd: true,
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText("Pro plan");

    await user.click(screen.getByRole("button", { name: /cancel subscription/i }));
    await user.click(screen.getByRole("button", { name: /cancel at period end/i }));

    await waitFor(() => {
      expect(mocks.cancelSubscription).toHaveBeenCalled();
    });
    expect(await screen.findByText(/you keep pro until the period ends/i)).toBeInTheDocument();
  });
});
