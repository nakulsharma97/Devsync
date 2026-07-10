import { Star } from "lucide-react";
import { ScrollReveal } from "@/components/ScrollReveal";
import { testimonials } from "@/data/landing";

export default function TestimonialsSection() {
  return (
    <section className="relative z-10 py-16 md:py-24 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-accent/[0.02] to-transparent pointer-events-none" />
      <div className="mx-auto max-w-7xl relative">
        <ScrollReveal className="text-center mb-10">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 dark:from-amber-400 dark:via-orange-400 dark:to-red-400 bg-clip-text text-transparent mb-4 block">Testimonials</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Trusted by engineering leaders</h2>
        </ScrollReveal>

        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map((t, index) => (
            <ScrollReveal key={t.author} delay={index * 0.1} className="bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-indigo-500/20 hover:shadow-xl hover:-translate-y-1 group">
              <div className="flex gap-1 mb-4">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-500 text-amber-500 dark:fill-amber-400 dark:text-amber-400" />
                ))}
              </div>
              <p className="text-sm md:text-base text-foreground leading-relaxed mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.gradient} flex items-center justify-center shadow-md`}>
                  <span className="text-sm font-bold text-white">{t.initials}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{t.author}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
