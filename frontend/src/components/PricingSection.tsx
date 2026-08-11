import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { pricing } from "@/data/landing";
import { Check } from "lucide-react";

type Billing = "monthly" | "yearly";

export default function PricingSection() {
  const navigate = useNavigate();
  const [billing, setBilling] = useState<Billing>("monthly");

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
            Start for free. Upgrade when you need more power.
          </p>

          {/* Billing toggle */}
          <div className="mt-8 inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/60 p-1 backdrop-blur-sm shadow-sm">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                billing === "monthly"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("yearly")}
              className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                billing === "yearly"
                  ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Yearly
              <span
                className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${
                  billing === "yearly"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                }`}
              >
                −20%
              </span>
            </button>
          </div>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
          {pricing.map((plan, i) => {
            const isYearly = billing === "yearly";
            const price = isYearly ? plan.priceYearly : plan.price;
            return (
              <ScrollReveal key={plan.name} delay={i * 0.1} className="h-full">
                <div
                  className={`relative h-full rounded-2xl border p-8 transition-all duration-300 backdrop-blur-sm overflow-hidden group ${
                    plan.popular
                      ? "border-indigo-500/50 bg-gradient-to-b from-indigo-500/15 to-purple-500/10 shadow-xl shadow-indigo-500/10 scale-105 hover:shadow-2xl hover:shadow-indigo-500/20 hover:-translate-y-1"
                      : "border-border/40 bg-card/70 hover:border-indigo-500/30 hover:shadow-lg hover:-translate-y-1"
                  }`}
                >
                  {/* Sweeping shine on the popular plan */}
                  {plan.popular && (
                    <div
                      aria-hidden
                      className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl"
                    >
                      <div className="animate-shine-sweep absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                    </div>
                  )}

                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                      <span className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="relative mb-6">
                    <h3 className="text-lg font-semibold mb-1">{plan.name}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {plan.description}
                    </p>
                    <div className="flex items-baseline gap-2">
                      {isYearly && plan.priceYearly !== plan.price && (
                        <span className="text-lg text-muted-foreground/60 line-through">
                          {plan.price}
                        </span>
                      )}
                      <span
                        key={`${plan.name}-${billing}`}
                        className="inline-block text-4xl font-bold animate-fade-in-up"
                      >
                        {price}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {isYearly ? plan.periodYearly : plan.period}
                      </span>
                    </div>
                  </div>

                  <ul className="relative space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li
                        key={f}
                        className="flex items-start gap-2.5 text-sm"
                      >
                        <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0 transition-transform duration-200 group-hover:scale-110" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    onClick={() => navigate("/auth")}
                    className={`w-full relative ${
                      plan.popular
                        ? "bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 shadow-lg"
                        : "bg-card border border-border/50 hover:border-indigo-500/30 hover:bg-indigo-500/5"
                    }`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </div>
              </ScrollReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
