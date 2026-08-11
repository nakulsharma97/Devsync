import { Star, Quote } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { testimonials } from "@/data/landing";

export default function TestimonialsSection() {
  return (
    <section className="relative z-10 py-16 md:py-24 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl relative">
        <ScrollReveal className="text-center mb-10">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 dark:from-amber-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-4 block">
            Testimonials
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Trusted by engineering leaders
          </h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <ScrollReveal
              key={t.author}
              delay={index * 0.1}
              className="h-full"
            >
              <div className="relative h-full bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 group">
                {/* Decorative quote mark */}
                <Quote
                  aria-hidden
                  className="absolute top-5 right-5 w-8 h-8 text-indigo-500/10 dark:text-indigo-400/10 group-hover:text-indigo-500/25 dark:group-hover:text-indigo-400/25 transition-colors duration-300"
                />

                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className="w-4 h-4 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400 transition-transform duration-300 group-hover:scale-110"
                      style={{ transitionDelay: `${i * 40}ms` }}
                    />
                  ))}
                </div>

                <p className="text-sm md:text-base text-foreground leading-relaxed mb-6 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>

                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div
                    className={`p-[2px] rounded-full bg-gradient-to-br ${t.gradient} shadow-md transition-transform duration-300 group-hover:scale-105`}
                  >
                    <div className="w-10 h-10 rounded-full bg-background flex items-center justify-center">
                      <span className="text-sm font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                        {t.initials}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {t.author}
                    </p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
