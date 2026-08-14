import { useEffect, useRef, useState } from "react";
import { useCountUp } from "@/hooks/useCountUp";
import type { PublicStats } from "@/services/landingService";

interface DisplayStat {
  value: number;
  label: string;
  sub: string;
}

/**
 * Real platform statistics served by GET /api/public/stats. Numbers are
 * computed server-side from the database — never hardcoded, never inflated.
 * While loading (or if the fetch fails) the bar shows skeleton placeholders
 * instead of made-up figures.
 */
function AnimatedNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") {
      // Non-browser environments (SSR, tests): no scroll trigger, show the value.
      setInView(true);
      return;
    }
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

  const display = useCountUp(value, { enabled: inView });

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}

function buildStats(stats: PublicStats): DisplayStat[] {
  return [
    {
      value: stats.users,
      label: "Registered Developers",
      sub: `${stats.publicProjects.toLocaleString()} public project${stats.publicProjects === 1 ? "" : "s"}`,
    },
    {
      value: stats.projects,
      label: "Projects",
      sub: `${stats.completedProjects.toLocaleString()} completed`,
    },
    {
      value: stats.tasksCompleted,
      label: "Tasks Completed",
      sub: `of ${stats.tasks.toLocaleString()} total task${stats.tasks === 1 ? "" : "s"}`,
    },
    {
      value: stats.messages,
      label: "Messages Sent",
      sub: `${stats.members.toLocaleString()} collaborators`,
    },
  ];
}

export default function StatsBar({ stats }: { stats: PublicStats | null }) {
  const items = stats ? buildStats(stats) : null;

  return (
    <section className="relative border-y border-border/20 bg-background/40 backdrop-blur-sm overflow-hidden">
      {/* Soft top accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-px w-2/3 bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-14">
        {items === null ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8" aria-hidden="true">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="mx-auto h-10 md:h-12 w-24 rounded-lg bg-muted/50 animate-pulse" />
                <div className="mx-auto mt-3 h-3 w-28 rounded bg-muted/40 animate-pulse" />
                <div className="mx-auto mt-2 h-2.5 w-20 rounded bg-muted/30 animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            {items.map((stat, i) => (
              <div
                key={stat.label}
                className="text-center group animate-fade-in-up"
                style={{ animationDelay: `${0.1 + i * 0.1}s` }}
              >
                <span className="inline-block text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent transition-transform duration-300 group-hover:scale-105">
                  <AnimatedNumber value={stat.value} />
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
        )}
      </div>
    </section>
  );
}
