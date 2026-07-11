import { useState, lazy, Suspense } from "react";
import { useNavigate } from "react-router";
import { ErrorBoundary } from "@/components/ErrorBoundary";
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
import { keyframesStyle } from "@/data/landing";

const Hero3D = lazy(() => import("@/components/Hero3D"));

export default function Landing() {
  const navigate = useNavigate();
  const [overlayMode, setOverlayMode] = useState(0);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      <style>{keyframesStyle}</style>

      {/* 3D rotating torus knot background */}
      <ErrorBoundary>
        <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-b from-background via-indigo-950/20 to-background" />}>
          <Hero3D intensity={0} color="#000000" />
        </Suspense>
      </ErrorBoundary>

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
