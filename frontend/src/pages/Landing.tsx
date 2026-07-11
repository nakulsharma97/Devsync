import ScrollProgress from "@/components/ScrollProgress";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import StatsBar from "@/components/StatsBar";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import EnterpriseSection from "@/components/EnterpriseSection";
import PricingSection from "@/components/PricingSection";
import FinalCtaSection from "@/components/FinalCtaSection";
import FooterSection from "@/components/FooterSection";
import AnimatedBackground from "@/components/AnimatedBackground";
import { keyframesStyle } from "@/data/landing";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      <style>{keyframesStyle}</style>

      {/* Animated gradient blob background */}
      <AnimatedBackground />

      {/* Veil for text readability */}
      <div className="fixed inset-0 bg-gradient-to-t from-background/30 via-transparent to-transparent pointer-events-none z-[1]" />

      <div className="relative z-10">
        <ScrollProgress />
        <Navbar />
        <HeroSection />
        <StatsBar />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <EnterpriseSection />
        <PricingSection />
        <FinalCtaSection />
        <FooterSection />
      </div>
    </div>
  );
}
