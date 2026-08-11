import { useEffect, useRef, useState } from "react";
import { stats } from "@/data/landing";
import { useCountUp } from "@/hooks/useCountUp";

interface ParsedStat {
  prefix: string;
  number: number;
  decimals: number;
  suffix: string;
}

function parseStat(value: string): ParsedStat {
  const match = value.match(/^([^\d]*)([\d.,]+)(.*)$/);
  if (!match) return { prefix: "", number: 0, decimals: 0, suffix: "" };
  const [, prefix, raw, suffix] = match;
  const cleaned = raw.replace(/,/g, "");
  const decimals = cleaned.includes(".") ? cleaned.split(".")[1].length : 0;
  return { prefix, number: parseFloat(cleaned), decimals, suffix };
}

function AnimatedStat({ value }: { value: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  // Only animate once the stat scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const parsed = parseStat(value);
  const display = useCountUp(parsed.number, {
    decimals: parsed.decimals,
    enabled: inView,
  });

  return (
    <span ref={ref}>
      {parsed.prefix}
      {display}
      {parsed.suffix}
    </span>
  );
}

export default function StatsBar() {
  return (
    <section className="relative border-y border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
      {/* Soft top accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="text-center group animate-fade-in-up"
              style={{ animationDelay: `${0.1 + i * 0.1}s` }}
            >
              <span className="inline-block text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                <AnimatedStat value={stat.value} />
              </span>
              <p className="text-xs md:text-sm text-muted-foreground mt-1.5 font-medium transition-colors group-hover:text-foreground">
                {stat.label}
              </p>
              <p className="text-[10px] md:text-xs text-indigo-600/80 dark:text-indigo-400/70 mt-0.5 flex items-center justify-center gap-1">
                <span className="w-1 h-1 rounded-full bg-indigo-400/60 transition-transform duration-300 group-hover:scale-150" />
                {stat.sub}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
