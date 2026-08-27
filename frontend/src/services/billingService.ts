import api from "./api";

export interface Plan {
  code: string;
  name: string;
  description: string;
  priceInr: number;
  currency: string;
  privateProjectLimit: number | null;
  membersPerProject: number;
  storageBytes: number;
  advancedAnalytics: boolean;
  customDomain: boolean;
  sso: boolean;
  auditLevel: string;
  prioritySupport: boolean;
  billingMode?: string | null;
}

export interface SubscriptionInfo {
  planCode: string;
  planName: string;
  priceInr: number;
  status: string;
  provider?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  billingMode?: string | null;
}

export interface PaymentRecord {
  id: string;
  planCode: string;
  amountPaise: number;
  currency: string;
  status: string;
  providerPaymentId?: string | null;
  paidAt?: string | null;
  createdAt: string;
}

export interface Usage {
  planCode: string;
  planName: string;
  privateProjects: { used: number; limit: number | null };
  storage: { usedBytes: number; limitBytes: number };
  members: { maxInOwnedProject: number; limit: number };
  advancedAnalytics: boolean;
}

export interface CheckoutSession {
  provider: string;
  planCode: string;
  planName: string;
  // Razorpay fields
  orderId?: string;
  amountPaise?: number;
  currency?: string;
  keyId?: string;
  // Stripe fields
  checkoutUrl?: string;
}

export interface RefundRequest {
  id: string;
  userId: string;
  paymentId: string;
  reason: string;
  status: string;
  adminNote?: string | null;
  reviewedAt?: string | null;
  createdAt: string;
}

export type RefundRequestStatus = "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";

export const billingService = {
  async getPlans(): Promise<Plan[]> {
    const res = await api.get("/public/plans");
    return res.data;
  },

  async getSubscription(): Promise<SubscriptionInfo> {
    const res = await api.get("/billing/subscription");
    return res.data;
  },

  async getUsage(): Promise<Usage> {
    const res = await api.get("/billing/usage");
    return res.data;
  },

  async getPayments(): Promise<PaymentRecord[]> {
    const res = await api.get("/billing/payments");
    return res.data;
  },

  async createCheckout(planCode: string, provider?: string): Promise<CheckoutSession> {
    const res = await api.post("/billing/checkout", { planCode, provider });
    return res.data;
  },

  async cancelSubscription(): Promise<SubscriptionInfo> {
    const res = await api.post("/billing/cancel");
    return res.data;
  },

  async requestRefund(paymentId: string, reason: string): Promise<RefundRequest> {
    const res = await api.post("/billing/refund-requests", { paymentId, reason });
    return res.data;
  },

  async getMyRefundRequests(): Promise<RefundRequest[]> {
    const res = await api.get("/billing/refund-requests");
    return res.data;
  },
};
