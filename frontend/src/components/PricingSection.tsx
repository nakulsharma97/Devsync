import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Check, Loader2 } from "lucide-react";
import { billingService, type Plan } from "@/services/billingService";

function formatBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / 1024 / 1024;
  if (mb < 1024) return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function featuresFor(plan: Plan): string[] {
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
}

export default function PricingSection() {
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    billingService
      .getPlans()
      .then((data) => {
        if (active) setPlans(data);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <section
      id="pricing"
      className="relative py-16 md:py-24 px-4 sm:px-6 bg-background/30 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="text-center mb-10">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent mb-4 block">
            Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            Start free. Upgrade when you need more private projects, storage or analytics.
          </p>
        </ScrollReveal>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : error ? (
          <p className="text-center text-muted-foreground py-12">
            Pricing could not be loaded right now. Try again shortly.
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {plans.map((plan, i) => {
              const popular = plan.code === "PRO";
              return (
                <ScrollReveal key={plan.code} delay={i * 0.1} className="h-full">
                  <div
                    className={`relative h-full rounded-2xl border p-8 transition-all duration-300 backdrop-blur-sm overflow-hidden group ${
                      popular
                        ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/15 to-purple-500/10 shadow-xl shadow-indigo-500/10 scale-105 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1"
                        : "border-border/40 bg-card/70 hover:border-indigo-500/30 hover:shadow-lg hover:-translate-y-1"
                    }`}
                  >
                    {popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="relative mb-6">
                      <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="inline-block text-4xl font-bold animate-fade-in-up">
                          ₹{plan.priceInr}
                        </span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>

                    <ul className="relative space-y-3 mb-8">
                      {featuresFor(plan).map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() =>
                        navigate(plan.priceInr > 0 ? "/auth?upgrade=1" : "/auth")
                      }
                      className={`w-full relative ${
                        popular
                          ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg"
                          : "bg-card border border-border/50 hover:border-indigo-500/30 hover:bg-indigo-500/5"
                      }`}
                      variant={popular ? "default" : "outline"}
                    >
                      {plan.priceInr === 0 ? "Get Started" : plan.code === "ENTERPRISE" ? "View Enterprise" : "Upgrade to Pro"}
                    </Button>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
