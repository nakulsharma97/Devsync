import { ScrollReveal } from "@/components/ScrollReveal";
import { features } from "@/data/landing";

export default function FeaturesSection() {
  return (
    <section id="features" className="relative z-10 py-16 md:py-24 px-4 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <ScrollReveal className="text-center mb-10 md:mb-16">
          <span className="text-xs font-semibold tracking-[0.2em] uppercase bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent mb-4 block">Everything you need</span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Build better software,<br /><span className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">faster than ever</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            A complete development platform with AI-powered tools, real-time collaboration, and enterprise-grade infrastructure.
          </p>
        </ScrollReveal>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {features.map((feature, index) => (
            <ScrollReveal key={feature.title} delay={index * 0.08} className="group relative bg-card/70 backdrop-blur-sm border border-border/40 rounded-2xl p-6 md:p-8 transition-all duration-300 hover:border-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 overflow-hidden">
              <div className={`absolute inset-0 bg-gradient-to-br from-${feature.iconBg.split(" ")[0].replace("from-", "").replace("500", "")}/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`} />
              <div className="relative z-10">
                <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${feature.iconBg} flex items-center justify-center mb-5 shadow-lg transition-all duration-200 group-hover:scale-110 group-hover:shadow-xl`}>
                  <feature.icon className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-base font-semibold mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors duration-200">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-indigo-500 to-purple-600 scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left" />
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
