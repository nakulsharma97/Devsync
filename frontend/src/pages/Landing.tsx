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
import ParticleField from "@/components/ParticleField";
import { keyframesStyle } from "@/data/landing";

export default function Landing() {
  return (
    <div className="min-h-screen text-foreground overflow-x-hidden relative">
      <style>{keyframesStyle}</style>

      {/* Premium animated background */}
      <div className="fixed inset-0 z-0">
        <ParticleField />
      </div>

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
