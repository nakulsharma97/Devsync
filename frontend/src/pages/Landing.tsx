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
import AnimatedBackground from "@/components/AnimatedBackground";
import { keyframesStyle, overlayPresets } from "@/data/landing";

const Hero3D = lazy(() => import("@/components/Hero3D"));

export default function Landing() {
  const navigate = useNavigate();
  const [overlayMode, setOverlayMode] = useState(0);

  const currentOverlay = overlayPresets[overlayMode];

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      <style>{keyframesStyle}</style>

      {/* Full-page 3D background */}
      <ErrorBoundary>
        <Suspense fallback={<div className="fixed inset-0 bg-gradient-to-b from-background via-indigo-950/20 to-background" />}>
          <Hero3D intensity={currentOverlay.intensity} color={currentOverlay.color} />
        </Suspense>
      </ErrorBoundary>

      {/* Overlay toggle */}
      <div className="fixed bottom-6 right-6 z-[60] flex items-center gap-1 bg-background/70 backdrop-blur-md border border-border/40 rounded-full px-2.5 py-1.5 shadow-lg">
        {overlayPresets.map((preset, i) => (
          <button
            key={i}
            onClick={() => setOverlayMode(i)}
            className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] transition-all duration-200 ${
              overlayMode === i
                ? "bg-indigo-500/20 ring-2 ring-indigo-500/40 scale-110"
                : "hover:bg-accent/10 hover:scale-105"
            }`}
            title={preset.label}
          >
            {preset.icon}
          </button>
        ))}
      </div>

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
