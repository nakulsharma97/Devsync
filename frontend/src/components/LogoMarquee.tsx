import { companies } from "@/data/landing";
import { ScrollReveal } from "@/components/ScrollReveal";

/**
 * Infinite-scrolling "Trusted by" logo strip.
 * The list is rendered twice and the track translates -50% for a seamless
 * loop (see `marquee` keyframes in data/landing.ts).
 */
export default function LogoMarquee() {
  return (
    <section className="relative z-10 py-10 md:py-14 border-y border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal className="text-center mb-8">
          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/70">
            Trusted by engineering teams at
          </p>
        </ScrollReveal>
      </div>

      {/* Edge fade masks */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 sm:w-32 z-10 bg-gradient-to-r from-background to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 sm:w-32 z-10 bg-gradient-to-l from-background to-transparent" />

      <div className="group relative flex overflow-hidden">
        <div className="animate-marquee flex shrink-0 items-center gap-10 md:gap-16 px-5 md:px-8 group-hover:[animation-play-state:paused]">
          {[...companies, ...companies].map((company, i) => (
            <div
              key={`${company.name}-${i}`}
              className="flex items-center gap-2.5 opacity-50 hover:opacity-100 transition-opacity duration-300 cursor-default select-none"
            >
              <company.icon className="w-5 h-5 text-indigo-500/80 dark:text-indigo-400/80" />
              <span className="text-base md:text-lg font-bold tracking-tight text-foreground/80">
                {company.name}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
