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
  orderId: string;
  amountPaise: number;
  currency: string;
  keyId: string;
  planCode: string;
  planName: string;
}

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

  async createCheckout(planCode: string): Promise<CheckoutSession> {
    const res = await api.post("/billing/checkout", { planCode });
    return res.data;
  },

  async cancelSubscription(): Promise<SubscriptionInfo> {
    const res = await api.post("/billing/cancel");
    return res.data;
  },
};
