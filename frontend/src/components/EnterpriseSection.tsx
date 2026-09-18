import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ScrollRevealFromLeft, ScrollRevealFromRight } from "@/components/ScrollReveal";
import { benefits } from "@/data/landing";
import { Command, ChevronRight } from "lucide-react";
import type { PublicStats } from "@/services/landingService";

export default function EnterpriseSection({ stats }: { stats: PublicStats | null }) {
  const navigate = useNavigate();

  return (
    <section id="enterprise" className="relative z-10 py-16 md:py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          <ScrollRevealFromLeft>
            <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-primary to-accent-hover bg-clip-text text-transparent mb-4 block">Why DevSync</span>
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight mb-6">Built by engineers, for engineers</h2>
            <p className="text-muted-foreground leading-relaxed mb-8 max-w-md">
              We&apos;ve spent years building software and know what really matters. DevSync delivers the tools you need without the noise.
            </p>
            <div className="space-y-4">
              {benefits.map((b) => (
                <div key={b.text} className="flex items-center gap-3 group">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-primary/20 flex items-center justify-center shrink-0 group-hover:from-primary/30 group-hover:to-primary/30 transition-all duration-200">
                    <b.icon className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">{b.text}</span>
                </div>
              ))}
            </div>
          </ScrollRevealFromLeft>

          <ScrollRevealFromRight>
            <div className="aspect-[4/3] rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-border/50 p-6 md:p-8 flex items-center justify-center relative overflow-hidden group hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="text-center relative z-10">
                <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/20 flex items-center justify-center mx-auto mb-6 ring-1 ring-primary/20 group-hover:scale-110 transition-transform duration-300">
                  <Command className="w-12 h-12 text-primary" />
                </div>
                <p className="text-xl font-semibold mb-2">Ready to ship faster?</p>
                <p className="text-sm text-muted-foreground mb-6">
                  {stats && stats.users > 0
                    ? `Join ${stats.users.toLocaleString()} developer${stats.users === 1 ? "" : "s"} already building on DevSync.`
                    : "Start building your next project on DevSync today."}
                </p>
                <Button onClick={() => navigate("/auth?mode=register")} className="shadow-xl hover:shadow-2xl transition-all duration-200 bg-primary text-primary-foreground hover:from-primary hover:to-primary">
                  Get started<ChevronRight className="ml-1 w-4 h-4" />
                </Button>
              </div>
            </div>
          </ScrollRevealFromRight>
        </div>
      </div>
    </section>
  );
}
