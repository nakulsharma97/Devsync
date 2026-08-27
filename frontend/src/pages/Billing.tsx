import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Crown, Loader2, PartyPopper, RefreshCw, X } from "lucide-react";
import { billingService, type Plan, type Usage, type PaymentRecord, type RefundRequest } from "@/services/billingService";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Skeleton } from "@/components/Skeletons";
import api from "@/services/api";

/* eslint-disable @typescript-eslint/no-explicit-any */

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function formatINR(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`;
}

function formatDate(iso?: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function loadRazorpay(): Promise<any> {
  return new Promise((resolve, reject) => {
    if ((window as any).Razorpay) {
      resolve((window as any).Razorpay);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve((window as any).Razorpay);
    script.onerror = () => reject(new Error("Unable to load the payment gateway"));
    document.body.appendChild(script);
  });
}

function UsageBar({ label, used, limit, unit }: { label: string; used: number; limit: number | null; unit: string }) {
  const pct = limit && limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const nearLimit = pct >= 90;
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className={nearLimit ? "text-amber-600 dark:text-amber-400 font-medium" : "text-foreground"}>
          {limit === null ? `${unit}${used} · Unlimited` : `${unit}${used} / ${unit}${limit}`}
        </span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${nearLimit ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function Billing() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const { subscription, refreshSubscription } = useSubscription();
  const [usage, setUsage] = useState<Usage | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [refundRequests, setRefundRequests] = useState<RefundRequest[]>([]);
  const [refundModalOpen, setRefundModalOpen] = useState<string | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [refundSubmitting, setRefundSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [usg, pays, planList, refundReqs] = await Promise.allSettled([
        billingService.getUsage(),
        billingService.getPayments(),
        billingService.getPlans(),
        billingService.getMyRefundRequests(),
      ]);
      await refreshSubscription();
      if (usg.status === "fulfilled") setUsage(usg.value);
      if (pays.status === "fulfilled") setPayments(pays.value);
      if (planList.status === "fulfilled") setPlans(planList.value);
      if (refundReqs.status === "fulfilled") setRefundRequests(refundReqs.value);
    } catch {
      toast.error("Could not load billing information");
    } finally {
      setLoading(false);
    }
  }, [refreshSubscription]);

  useEffect(() => {
    // Eagerly load the CSRF token so it's available when the user clicks
    // "Upgrade to Pro" (a POST request). Without this, the token might not
    // be in the cookie yet if no prior GET response set it.
    api.get("/auth/csrf").catch(() => { /* best-effort */ });
    refresh();
  }, [refresh]);

  const currentPlanCode = subscription?.planCode ?? "FREE";
  const isPaid = currentPlanCode !== "FREE";
  const periodEndsSoon =
    subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() - Date.now() < 7 * 86400_000;

  const upgrade = useCallback(
    async (plan: Plan, provider?: string) => {
      if (plan.code === currentPlanCode) return;

      setCheckoutLoading(plan.code);
      try {
        const session = await billingService.createCheckout(plan.code, provider);

        if (session.provider === "STRIPE" && session.checkoutUrl) {
          // Stripe: redirect to hosted Checkout page.
          // The user will be redirected back to success/cancel URL after payment.
          window.location.href = session.checkoutUrl;
          return;
        }

        // Razorpay: open the inline Checkout modal.
        const Razorpay = await loadRazorpay();
        const rzp = new Razorpay({
          key: session.keyId,
          amount: session.amountPaise,
          currency: session.currency,
          order_id: session.orderId,
          name: "DevSync",
          description: `${plan.name} plan`,
          theme: { color: "#0f766e" },
          handler: async () => {
            toast.success("Payment received — activating your plan");
            const currentPlan = subscription?.planCode;
            for (let attempt = 0; attempt < 3; attempt++) {
              await new Promise((r) => setTimeout(r, 2000 + attempt * 2000));
              const fresh = await refreshSubscription();
              if (fresh && fresh.planCode !== currentPlan) {
                toast.success(`Your ${fresh.planName} plan is now active!`);
                break;
              }
              if (attempt === 2) {
                toast.info("Your payment was received — it may take a minute to activate. Refresh if it doesn't update shortly.");
              }
            }
          },
          modal: {
            ondismiss: () => setCheckoutLoading(null),
          },
        });
        rzp.open();
      } catch (err: any) {
        const status = err?.response?.status;
        if (status === 503) {
          toast.error("Payments are not configured yet — try again later.");
        } else if (status === 403) {
          toast.error("You don't have permission to perform this action. Please log in again.");
        } else if (status === 409) {
          toast.error(err?.response?.data?.message || "You are already subscribed to this plan.");
        } else if (status === 400) {
          toast.error(err?.response?.data?.message || "Invalid request. Please try again.");
        } else if (!err?.response) {
          toast.error("Unable to connect to the server. Please try again.");
        } else {
          toast.error("Unable to start checkout. Please try again.");
        }
        setCheckoutLoading(null);
      }
    },
    [currentPlanCode, refresh, refreshSubscription, subscription]
  );

  const cancelSubscription = useCallback(async () => {
    try {
      await billingService.cancelSubscription();
      await refreshSubscription();
      setCancelOpen(false);
      toast.success("Subscription cancelled — you keep Pro until the period ends");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not cancel the subscription");
    }
  }, [refreshSubscription]);

  const submitRefund = useCallback(async (paymentId: string) => {
    if (!refundReason.trim()) return;
    setRefundSubmitting(true);
    try {
      await billingService.requestRefund(paymentId, refundReason.trim());
      toast.success("Refund request submitted — our team will review it");
      setRefundModalOpen(null);
      setRefundReason("");
      // Refresh refund requests.
      const reqs = await billingService.getMyRefundRequests();
      setRefundRequests(reqs);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not submit refund request");
    } finally {
      setRefundSubmitting(false);
    }
  }, [refundReason]);

  const REFUND_WINDOW_MS = 7 * 86400_000; // matches backend default

  const isRefundEligible = useCallback((p: PaymentRecord) => {
    if (p.status !== "SUCCESS") return false;
    const paidAt = p.paidAt ? new Date(p.paidAt).getTime() : new Date(p.createdAt).getTime();
    return Date.now() - paidAt < REFUND_WINDOW_MS;
  }, []);

  const hasPendingRefund = useCallback((paymentId: string) => {
    return refundRequests.some((r) => r.paymentId === paymentId && r.status === "PENDING");
  }, [refundRequests]);

  const getRefundStatus = useCallback((paymentId: string) => {
    return refundRequests.find((r) => r.paymentId === paymentId);
  }, [refundRequests]);

  const planFeatures = useMemo(
    () => (plan: Plan) => {
      const f: string[] = [];
      f.push("Unlimited public projects");
      f.push(
        plan.privateProjectLimit === null
          ? "Unlimited private projects"
          : `${plan.privateProjectLimit} private projects`
      );
      f.push(`Up to ${plan.membersPerProject} members per project`);
      f.push(`${formatBytes(plan.storageBytes)} storage`);
      f.push(plan.advancedAnalytics ? "Advanced analytics" : "Basic analytics");
      f.push(plan.prioritySupport ? "Priority support" : "Community support");
      return f;
    },
    []
  );

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8 animate-in fade-in duration-200">
        {/* Header */}
        <header className="space-y-1.5">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </header>

        {/* Current plan card */}
        <section className="rounded-2xl border border-border/40 bg-card/70 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-5 w-24" />
                  <Skeleton className="h-4 w-12 rounded-full" />
                </div>
                <Skeleton className="h-3.5 w-48" />
              </div>
            </div>
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
          <div className="mt-6 grid sm:grid-cols-3 gap-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-16" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))}
          </div>
        </section>

        {/* Plan cards */}
        <section className="grid md:grid-cols-3 gap-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-card/70 p-6 space-y-4">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-9 w-16" />
              <div className="space-y-2.5 pt-2">
                {[0, 1, 2, 3].map((j) => (
                  <div key={j} className="flex items-center gap-2">
                    <Skeleton className="w-4 h-4 rounded shrink-0" />
                    <Skeleton className="h-3 w-full" />
                  </div>
                ))}
              </div>
              <Skeleton className="h-9 w-full rounded-lg mt-auto" />
            </div>
          ))}
        </section>

        {/* Payment history */}
        <section className="rounded-2xl border border-border/40 bg-card/70 p-6">
          <Skeleton className="h-5 w-36 mb-4" />
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-4 py-2.5 border-b border-border/20 last:border-0">
              <Skeleton className="h-3.5 w-24" />
              <Skeleton className="h-3.5 w-16" />
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-4 w-16 rounded-full" />
            </div>
          ))}
        </section>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold">Billing &amp; Subscription</h1>
        <p className="text-sm text-muted-foreground mt-1">
          All limits are enforced server-side — payments are verified by the payment provider webhook.
        </p>
      </header>

      {/* Current plan */}
      <section className="rounded-2xl border border-border/40 bg-card/70 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isPaid ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-muted"}`}>
              {isPaid ? <Crown className="w-5 h-5 text-white" /> : <PartyPopper className="w-5 h-5 text-muted-foreground" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">{subscription?.planName ?? "Free"} plan</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                    subscription?.status === "ACTIVE"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : subscription?.status === "PAST_DUE"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {subscription?.status ?? "FREE"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPaid ? (
                  <>
                    ₹{subscription?.priceInr}/month · Valid until {formatDate(subscription?.currentPeriodEnd)}
                    {subscription?.cancelAtPeriodEnd && " · Cancels at period end"}
                    {!subscription?.cancelAtPeriodEnd && " · Renew manually before this date to keep access"}
                  </>
                ) : (
                  "You're on the Free plan — no payment required."
                )}
              </p>
              {periodEndsSoon && isPaid && !subscription?.cancelAtPeriodEnd && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Your plan expires soon — renew manually to keep access.</p>
              )}
            </div>
          </div>
          <div className="flex gap-2">
            {isPaid ? (
              subscription?.cancelAtPeriodEnd ? (
                <span className="text-sm text-muted-foreground">Plan ends {formatDate(subscription.currentPeriodEnd)}</span>
              ) : (
                <button
                  onClick={() => setCancelOpen(true)}
                  className="text-sm px-4 py-2 rounded-lg border border-border/50 hover:bg-destructive/10 hover:text-destructive transition-colors"
                >
                  Cancel subscription
                </button>
              )
            ) : null}
            {!isPaid && (
              <button
                onClick={() => document.getElementById("plans")?.scrollIntoView({ behavior: "smooth" })}
                className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
              >
                View plans
              </button>
            )}
          </div>
        </div>

        {usage && (
          <div className="mt-6 grid sm:grid-cols-3 gap-6">
            <UsageBar
              label="Private projects"
              used={usage.privateProjects.used}
              limit={usage.privateProjects.limit}
              unit=""
            />
            <UsageBar
              label="Storage"
              used={usage.storage.usedBytes}
              limit={usage.storage.limitBytes}
              unit={formatBytes(0).replace("0", "")}
            />
            <UsageBar label="Members / project" used={usage.members.maxInOwnedProject} limit={usage.members.limit} unit="" />
          </div>
        )}
      </section>

      {/* Cancel confirmation */}
      {cancelOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-card border border-border/40 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">Cancel subscription?</h2>
              <button onClick={() => setCancelOpen(false)} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              You keep {subscription?.planName} until {formatDate(subscription?.currentPeriodEnd)}. After that you'll
              automatically move to the Free plan — your projects and files stay intact.
            </p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setCancelOpen(false)} className="text-sm px-4 py-2 rounded-lg border border-border/50">
                Keep plan
              </button>
              <button
                onClick={cancelSubscription}
                className="text-sm px-4 py-2 rounded-lg bg-destructive text-white hover:opacity-90 transition-opacity"
              >
                Cancel at period end
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Plans */}
      <section id="plans" className="grid md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isCurrent = plan.code === currentPlanCode;
          const popular = plan.code === "PRO";
          return (
            <div
              key={plan.code}
              className={`relative rounded-2xl border p-6 flex flex-col ${
                popular
                  ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/10 to-purple-500/5 shadow-xl shadow-indigo-500/10"
                  : "border-border/40 bg-card/70"
              }`}
            >
              {popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  Most Popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1 mb-4">{plan.description}</p>
              <div className="flex items-baseline gap-1.5 mb-6">
                <span className="text-4xl font-bold">₹{plan.priceInr}</span>
                <span className="text-sm text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-2.5 mb-6 flex-1">
                {planFeatures(plan).map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="text-center text-sm font-medium px-4 py-2 rounded-lg bg-muted text-muted-foreground">
                  Current plan
                </span>
              ) : (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => upgrade(plan, "RAZORPAY")}
                    disabled={checkoutLoading !== null}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 ${
                      popular
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
                        : "border border-border/50 hover:border-indigo-500/30"
                    }`}
                  >
                    {checkoutLoading === plan.code ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating checkout…
                      </span>
                    ) : (
                      `Pay with Razorpay`
                    )}
                  </button>
                  <button
                    onClick={() => upgrade(plan, "STRIPE")}
                    disabled={checkoutLoading !== null}
                    className="px-4 py-2 rounded-lg text-sm font-medium border border-border/50 hover:border-indigo-500/30 transition-all disabled:opacity-60"
                  >
                    {checkoutLoading === plan.code ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating checkout…
                      </span>
                    ) : (
                      `Pay with Stripe`
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Payment history */}
      <section className="rounded-2xl border border-border/40 bg-card/70 p-6">
        <h2 className="font-semibold mb-4">Payment history</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments yet. Upgrading to Pro or Enterprise records your history here.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/40">
                  <th className="py-2 pr-4 font-medium">Date</th>
                  <th className="py-2 pr-4 font-medium">Plan</th>
                  <th className="py-2 pr-4 font-medium">Amount</th>
                  <th className="py-2 pr-4 font-medium">Status</th>
                  <th className="py-2 font-medium">Refund</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const refundStatus = getRefundStatus(p.id);
                  const eligible = isRefundEligible(p);
                  const pending = hasPendingRefund(p.id);
                  return (
                    <tr key={p.id} className="border-b border-border/20 last:border-0">
                      <td className="py-2.5 pr-4">{formatDate(p.createdAt)}</td>
                      <td className="py-2.5 pr-4">{p.planCode}</td>
                      <td className="py-2.5 pr-4">
                        {formatINR(p.amountPaise)} <span className="text-muted-foreground text-xs">{p.currency}</span>
                      </td>
                      <td className="py-2.5 pr-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${
                            p.status === "SUCCESS"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : p.status === "FAILED"
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : p.status === "REFUNDED"
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td className="py-2.5">
                        {refundStatus ? (
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wide ${
                              refundStatus.status === "PENDING"
                                ? "text-amber-600 dark:text-amber-400"
                                : refundStatus.status === "APPROVED" || refundStatus.status === "COMPLETED"
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-red-600 dark:text-red-400"
                            }`}
                          >
                            {refundStatus.status === "REJECTED" ? "Refund declined" : `Refund ${refundStatus.status.toLowerCase()}`}
                          </span>
                        ) : eligible && !pending ? (
                          <button
                            onClick={() => setRefundModalOpen(p.id)}
                            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 transition-colors"
                          >
                            Request refund
                          </button>
                        ) : p.status === "SUCCESS" && !eligible ? (
                          <span className="text-[10px] text-muted-foreground" title="Refund window (7 days) has passed">
                            Window passed
                          </span>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Refund request modal */}
      {refundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="bg-card border border-border/40 rounded-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <h2 className="font-semibold">Request refund</h2>
              <button onClick={() => { setRefundModalOpen(null); setRefundReason(""); }} aria-label="Close" className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground">
              Please provide a reason for your refund request. Our team will review it within 1-2 business days.
            </p>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              placeholder="Why are you requesting a refund?"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-border/50 bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setRefundModalOpen(null); setRefundReason(""); }}
                className="text-sm px-4 py-2 rounded-lg border border-border/50"
              >
                Cancel
              </button>
              <button
                onClick={() => submitRefund(refundModalOpen)}
                disabled={!refundReason.trim() || refundSubmitting}
                className="text-sm px-4 py-2 rounded-lg bg-amber-600 text-white hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {refundSubmitting ? "Submitting…" : "Submit request"}
              </button>
            </div>
          </div>
        </div>
      )}

      <footer className="text-xs text-muted-foreground flex items-center gap-2">
        <RefreshCw className="w-3.5 h-3.5" />
        Plan changes are activated only after the payment provider verifies the transaction. Card details never touch
        DevSync servers.
      </footer>
    </div>
  );
}
