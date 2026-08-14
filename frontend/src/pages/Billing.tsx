import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Check, Crown, Loader2, PartyPopper, RefreshCw, X } from "lucide-react";
import { billingService, type Plan, type SubscriptionInfo, type Usage, type PaymentRecord } from "@/services/billingService";

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
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [sub, usg, pays, planList] = await Promise.all([
        billingService.getSubscription(),
        billingService.getUsage(),
        billingService.getPayments(),
        billingService.getPlans(),
      ]);
      setSubscription(sub);
      setUsage(usg);
      setPayments(pays);
      setPlans(planList);
    } catch {
      toast.error("Could not load billing information");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const currentPlanCode = subscription?.planCode ?? "FREE";
  const isPaid = currentPlanCode !== "FREE";
  const periodEndsSoon =
    subscription?.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() - Date.now() < 7 * 86400_000;

  const upgrade = useCallback(
    async (plan: Plan) => {
      if (plan.code === currentPlanCode) return;
      setCheckoutLoading(plan.code);
      try {
        const session = await billingService.createCheckout(plan.code);
        const Razorpay = await loadRazorpay();
        const rzp = new Razorpay({
          key: session.keyId,
          amount: session.amountPaise,
          currency: session.currency,
          order_id: session.orderId,
          name: "DevSync",
          description: `${plan.name} plan`,
          theme: { color: "#0f766e" },
          handler: () => {
            toast.success("Payment received — activating your plan");
            // The backend webhook verifies the payment and activates the plan;
            // polling just reflects server truth.
            setTimeout(() => refresh(), 2000);
          },
          modal: {
            ondismiss: () => setCheckoutLoading(null),
          },
        });
        rzp.open();
      } catch (err: any) {
        if (err?.response?.status === 503) {
          toast.error("Payments are not configured yet — try again later.");
        } else {
          toast.error(err?.response?.data?.message || "Unable to start checkout");
        }
        setCheckoutLoading(null);
      }
    },
    [currentPlanCode, refresh]
  );

  const cancelSubscription = useCallback(async () => {
    try {
      const updated = await billingService.cancelSubscription();
      setSubscription(updated);
      setCancelOpen(false);
      toast.success("Subscription cancelled — you keep Pro until the period ends");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not cancel the subscription");
    }
  }, []);

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
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
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
                    ₹{subscription?.priceInr}/month · Renews {formatDate(subscription?.currentPeriodEnd)}
                    {subscription?.cancelAtPeriodEnd && " · Cancels at period end"}
                  </>
                ) : (
                  "You're on the Free plan — no payment required."
                )}
              </p>
              {periodEndsSoon && isPaid && !subscription?.cancelAtPeriodEnd && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">Your plan renews soon.</p>
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
                <button
                  onClick={() => upgrade(plan)}
                  disabled={checkoutLoading !== null}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all disabled:opacity-60 ${
                    popular
                      ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:opacity-90"
                      : "border border-border/50 hover:border-indigo-500/30"
                  }`}
                >
                  {checkoutLoading === plan.code ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Opening checkout…
                    </span>
                  ) : plan.code === "ENTERPRISE" ? (
                    "Contact us"
                  ) : (
                    `Upgrade to ${plan.name}`
                  )}
                </button>
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
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-border/20 last:border-0">
                    <td className="py-2.5 pr-4">{formatDate(p.createdAt)}</td>
                    <td className="py-2.5 pr-4">{p.planCode}</td>
                    <td className="py-2.5 pr-4">
                      {formatINR(p.amountPaise)} <span className="text-muted-foreground text-xs">{p.currency}</span>
                    </td>
                    <td className="py-2.5">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="text-xs text-muted-foreground flex items-center gap-2">
        <RefreshCw className="w-3.5 h-3.5" />
        Plan changes are activated only after the payment provider verifies the transaction. Card details never touch
        DevSync servers.
      </footer>
    </div>
  );
}
