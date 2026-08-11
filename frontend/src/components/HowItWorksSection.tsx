import { ChevronRight } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { howItWorksSteps } from "@/data/landing";

export default function HowItWorksSection() {
  return (
    <section
      id="docs"
      className="relative py-16 md:py-24 px-4 sm:px-6 bg-background/30 backdrop-blur-sm"
    >
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="text-center mb-10">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent mb-4 block">
            How it works
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            From idea to production in minutes
          </h2>
        </ScrollReveal>

        <div className="relative grid md:grid-cols-3 gap-8">
          {/* Animated connector line (desktop) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-1/2 left-[12%] right-[12%] -translate-y-1/2 h-px border-t border-dashed border-indigo-500/25"
          />
          <div
            aria-hidden
            className="hidden md:block absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-indigo-500/40 animate-pulse"
          />

          {howItWorksSteps.map((step, i) => (
            <ScrollReveal key={step.step} delay={i * 0.15} className="relative">
              <div className="bg-card border border-border/50 rounded-2xl p-8 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 transition-all duration-300 group h-full">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl font-black bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105 origin-left">
                    {step.step}
                  </span>
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-110 group-hover:-rotate-3`}
                  >
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-3 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors duration-200">
                  {step.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-8 -translate-y-1/2 z-10">
                  <div className="w-9 h-9 rounded-full bg-background border border-indigo-500/25 flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <ChevronRight className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                  </div>
                </div>
              )}
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
