import { ChevronRight } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { howItWorksSteps } from "@/data/landing";

export default function HowItWorksSection() {
  return (
    <section id="docs" className="relative py-16 md:py-24 px-4 sm:px-6 bg-background/30 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="text-center mb-10">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-400 dark:via-teal-400 dark:to-cyan-400 bg-clip-text text-transparent mb-4 block">How it works</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">From idea to production in minutes</h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-8">
          {howItWorksSteps.map((step, i) => (
            <ScrollReveal key={step.step} delay={i * 0.15} className="relative">
              <div className="bg-card border border-border/50 rounded-2xl p-8 hover:border-indigo-500/20 transition-all duration-300 group">
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-4xl font-black bg-gradient-to-br from-foreground to-foreground/20 bg-clip-text text-transparent">{step.step}</span>
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${step.gradient} flex items-center justify-center shadow-lg`}>
                    <step.icon className="w-5 h-5 text-white" />
                  </div>
                </div>
                <h3 className="text-lg font-semibold mb-3">{step.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
              </div>
              {i < 2 && (
                <div className="hidden md:block absolute top-1/2 -right-4 text-muted-foreground/30">
                  <ChevronRight className="w-6 h-6" />
                </div>
              )}
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
