import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Check } from "lucide-react";
import { type Plan } from "@/services/billingService";
import { landingService } from "@/services/landingService";

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

/**
 * Skeletons mirror the real card layout (same grid, same card padding and
 * roughly the same height) so swapping placeholders for plans does not move
 * the section — that swap was the main source of layout shift on the landing
 * page.
 */
function PricingSkeleton() {
  return (
    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch" aria-hidden="true">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-full rounded-2xl border border-border/40 bg-card/70 p-8"
        >
          <div className="h-5 w-24 rounded bg-muted/50 animate-pulse" />
          <div className="mt-3 h-3 w-full rounded bg-muted/30 animate-pulse" />
          <div className="mt-6 h-10 w-28 rounded bg-muted/40 animate-pulse" />
          <div className="mt-8 space-y-3">
            {[0, 1, 2, 3, 4, 5].map((j) => (
              <div key={j} className="h-3 w-full rounded bg-muted/30 animate-pulse" />
            ))}
          </div>
          <div className="mt-8 h-11 w-full rounded-md bg-muted/40 animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function PricingSection() {
  const navigate = useNavigate();
  // The plan catalogue is static and public — paint the cached copy instantly
  // on a remount instead of flashing a spinner.
  const [plans, setPlans] = useState<Plan[]>(() => landingService.peekPlans() ?? []);
  const [loading, setLoading] = useState(() => (landingService.peekPlans() ?? []).length === 0);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    landingService
      .getPlans()
      .then((data) => {
        if (active && data.length > 0) {
          setPlans(data);
          setError(false);
        }
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

  // One derived list per plan set rather than rebuilding it for every render.
  const planFeatures = useMemo(
    () => plans.map((plan) => ({ plan, features: featuresFor(plan) })),
    [plans]
  );

  return (
    <section
      id="pricing"
      className="relative py-20 md:py-32 px-6 sm:px-8 bg-background/30 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="text-center mb-12">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase text-accent-color mb-6 block">
            Pricing
          </span>
          <h2 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight">
            Simple, transparent pricing
          </h2>
          <p className="mt-6 text-muted-foreground text-lg max-w-md mx-auto">
            Start free. Upgrade when you need more private projects, storage or analytics.
          </p>
        </ScrollReveal>

        {loading ? (
          <PricingSkeleton />
        ) : error && planFeatures.length === 0 ? (
          <p className="text-center text-muted-foreground py-12 min-h-[240px] flex items-center justify-center">
            Pricing could not be loaded right now. Try again shortly.
          </p>
        ) : (
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto items-stretch">
            {planFeatures.map(({ plan, features }, i) => {
              const popular = plan.code === "PRO";
              return (
                <ScrollReveal key={plan.code} delay={i * 0.08} className="h-full">
                  <div
                    // The Pro card must NOT clip its content: the "Most Popular" pill
                    // straddles the top border from `-top-3`, so `overflow-hidden` here
                    // cut the badge in half. Only the non-popular cards keep the clip.
                    className={`relative h-full rounded-2xl border p-8 transition-all duration-300 backdrop-blur-sm group ${
                      popular
                        ? "overflow-visible border-primary/50 bg-gradient-to-b from-primary/10 to-primary/5 shadow-xl shadow-primary/10 scale-105 hover:shadow-2xl hover:shadow-primary/20 hover:-translate-y-1"
                        : "overflow-hidden border-border/40 bg-card/70 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1"
                    }`}
                  >
                    {popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                        <span className="bg-primary text-primary-foreground text-[10px] font-semibold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="relative mb-6">
                      <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{plan.description}</p>
                      <div className="flex items-baseline gap-2">
                        <span className="inline-block text-4xl font-bold tabular-nums">
                          ₹{plan.priceInr}
                        </span>
                        <span className="text-sm text-muted-foreground">/month</span>
                      </div>
                    </div>

                    <ul className="relative space-y-3 mb-8">
                      {features.map((f) => (
                        <li key={f} className="flex items-start gap-2.5 text-sm">
                          <Check className="w-4 h-4 text-primary mt-0.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
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
                          ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                          : "bg-card border border-border/50 hover:border-primary/30 hover:bg-primary/5"
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
