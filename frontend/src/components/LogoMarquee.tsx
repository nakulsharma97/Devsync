import { capabilities } from "@/data/landing";
import { ScrollReveal } from "@/components/ScrollReveal";

/**
 * "Built for modern development teams" strip showing real DevSync
 * capabilities. This replaces the previous marquee of invented customer
 * logos — we never claim customers we don't have.
 *
 * The strip is a static responsive grid (NOT a scrolling marquee): every
 * capability is fully visible at every breakpoint, nothing is clipped at the
 * viewport edges, and there is no horizontal overflow.
 */
export default function LogoMarquee() {
  return (
    <section className="relative z-10 py-10 md:py-14 border-y border-border/20 bg-background/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <ScrollReveal className="text-center mb-8">
          <p className="text-[10px] md:text-xs font-semibold uppercase tracking-[0.25em] text-muted-foreground/70">
            Built for modern development teams
          </p>
        </ScrollReveal>

        <ScrollReveal delay={0.08}>
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-6 md:gap-x-10 md:gap-y-7 items-center justify-items-center list-none">
            {capabilities.map((capability) => (
              <li
                key={capability.label}
                className="flex items-center gap-2.5 max-w-full opacity-70 hover:opacity-100 transition-opacity duration-300 select-none"
              >
                <capability.icon className="w-5 h-5 shrink-0 text-indigo-500/80 dark:text-indigo-400/80" />
                <span className="text-sm md:text-lg font-bold tracking-tight text-foreground/80 leading-snug text-center">
                  {capability.label}
                </span>
              </li>
            ))}
          </ul>
        </ScrollReveal>
      </div>
    </section>
  );
}
