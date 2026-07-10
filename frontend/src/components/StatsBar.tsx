import { stats } from "@/data/landing";

export default function StatsBar() {
  return (
    <section className="relative border-y border-border/20 bg-background/40 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-10 md:py-14">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, i) => (
            <div key={stat.label} className="text-center group animate-fade-in-up" style={{ animationDelay: `${0.1 + i * 0.1}s` }}>
              <span className="text-3xl md:text-4xl lg:text-5xl font-bold bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
                {stat.value}
              </span>
              <p className="text-xs md:text-sm text-muted-foreground mt-1.5 font-medium">{stat.label}</p>
              <p className="text-[10px] md:text-xs text-indigo-600/80 dark:text-indigo-400/70 mt-0.5">{stat.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
