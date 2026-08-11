import { useRef, type MouseEvent } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { features, type Feature } from "@/data/landing";

// Literal class strings so Tailwind's scanner can compile them — dynamic
// construction like `from-${...}` is NOT picked up at build time.
const overlayClasses: Record<string, string> = {
  "AI-Powered Code Editor": "from-indigo-500/10 to-purple-500/5",
  "Live Collaboration": "from-blue-500/10 to-cyan-500/5",
  "One-Click Deploy": "from-emerald-500/10 to-teal-500/5",
  "Dev Environment in Browser": "from-orange-500/10 to-amber-500/5",
  "Enterprise Security": "from-red-500/10 to-rose-500/5",
  "Smart Workspaces": "from-violet-500/10 to-fuchsia-500/5",
};

function FeatureCard({ feature, index }: { feature: Feature; index: number }) {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
    el.style.setProperty("--my", `${e.clientY - rect.top}px`);
  };

  return (
    <ScrollReveal
      delay={index * 0.08}
      className="h-full"
    >
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        className="group relative h-full bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 overflow-hidden"
      >
        {/* Fixed gradient tint (broken before — dynamic classes don't compile) */}
        <div
          className={`absolute inset-0 bg-gradient-to-br ${overlayClasses[feature.title] || "from-indigo-500/10 to-transparent"} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
        />
        {/* Mouse-follow spotlight */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              "radial-gradient(240px circle at var(--mx, 50%) var(--my, 50%), rgba(99,102,241,0.08), transparent 65%)",
          }}
        />
        <div className="relative z-10">
          <div
            className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-5 shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl group-hover:-rotate-3`}
          >
            <feature.icon className="w-5 h-5 text-white" />
          </div>
          <h3 className="text-base font-semibold mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors duration-200">
            {feature.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
      </div>
    </ScrollReveal>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 py-16 md:py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="text-center mb-10 md:mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-4 block">
            Everything you need
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Build better software,
            <br />
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
              faster than ever
            </span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            A complete development platform with AI-powered tools, real-time
            collaboration, and enterprise-grade infrastructure.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
