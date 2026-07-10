import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ScrollReveal";
import { Rocket, ExternalLink } from "lucide-react";

export default function FinalCtaSection() {
  const navigate = useNavigate();

  return (
    <section className="relative z-10 py-16 md:py-28 px-4 sm:px-6 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/[0.02] via-transparent to-purple-500/[0.02] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gradient-to-br from-indigo-500/8 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl pointer-events-none" />

      <ScrollReveal className="mx-auto max-w-3xl text-center relative z-10" delay={0.1}>
        <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-4 block">Get started</span>
        <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.05]">
          Ready to build<br />
          <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent">the next big thing?</span>
        </h2>
        <p className="mt-6 text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mx-auto">
          Join the platform that helps developers ship better software, faster. No credit card required.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button size="lg" onClick={() => navigate("/auth")} className="w-full sm:w-auto text-base px-10 h-12 shadow-xl hover:shadow-2xl transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-600 hover:to-purple-700 relative overflow-hidden group">
            <span className="relative z-10 flex items-center">
              Get Started Free<Rocket className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </Button>
          <Button variant="outline" size="lg" onClick={() => document.getElementById('docs')?.scrollIntoView({ behavior: 'smooth' })} className="w-full sm:w-auto text-base px-10 h-12 border-border/50 hover:border-indigo-500/30 hover:bg-indigo-500/5 transition-all duration-200">
            <ExternalLink className="mr-2 w-4 h-4" />View Documentation
          </Button>
        </div>
      </ScrollReveal>
    </section>
  );
}
