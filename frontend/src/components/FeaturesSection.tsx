import { useRef, type MouseEvent } from "react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { features, type Feature } from "@/data/landing";

const overlayClasses: Record<string, string> = {
  "Project Management": "from-primary/8 to-transparent",
  "Kanban Boards": "from-primary/6 to-transparent",
  "Team Chat": "from-accent/8 to-transparent",
  "GitHub Integration": "from-primary/10 to-transparent",
  "File Sharing": "from-primary/6 to-transparent",
  "Notifications": "from-destructive/6 to-transparent",
  "Team Collaboration": "from-accent/6 to-transparent",
  "Analytics": "from-primary/8 to-transparent",
  "Secure by Default": "from-accent/8 to-transparent",
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
    <ScrollReveal delay={index * 0.06} className="h-full">
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        className="group relative h-full bg-card border border-border/60 rounded-lg p-6 transition-all duration-200 hover:border-primary/30 hover:shadow-sm overflow-hidden"
      >
        <div
          className={`absolute inset-0 bg-gradient-to-br ${overlayClasses[feature.title] || "from-primary/5 to-transparent"} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
        />
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{
            background:
              "radial-gradient(200px circle at var(--mx, 50%) var(--my, 50%), rgba(79,109,245,0.04), transparent 60%)",
          }}
        />
        <div className="relative z-10">
          <div
            className={`w-9 h-9 rounded-md bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-4 transition-transform duration-200 group-hover:scale-105`}
          >
            <feature.icon className="w-4 h-4 text-white" />
          </div>
          <h3 className="font-display text-sm font-semibold mb-1.5 text-foreground">
            {feature.title}
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {feature.description}
          </p>
        </div>
      </div>
    </ScrollReveal>
  );
}

export default function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 py-16 md:py-24 px-6 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <ScrollReveal className="text-center mb-10 md:mb-16">
          <p className="text-xs font-medium text-primary mb-3 font-mono">
            capabilities
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Everything you need
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-xl mx-auto leading-relaxed">
            A complete collaboration platform with real-time updates throughout.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}
