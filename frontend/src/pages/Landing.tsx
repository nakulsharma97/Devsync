import { useEffect, useState } from "react";
import ScrollProgress from "@/components/ScrollProgress";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import LogoMarquee from "@/components/LogoMarquee";
import StatsBar from "@/components/StatsBar";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import TestimonialsSection from "@/components/TestimonialsSection";
import EnterpriseSection from "@/components/EnterpriseSection";
import PricingSection from "@/components/PricingSection";
import FinalCtaSection from "@/components/FinalCtaSection";
import FooterSection from "@/components/FooterSection";
import ParticleField from "@/components/ParticleField";
import {
  landingService,
  type PublicReviewsResponse,
  type PublicStats,
} from "@/services/landingService";

export default function Landing() {
  const [stats, setStats] = useState<PublicStats | null>(null);
  const [reviews, setReviews] = useState<PublicReviewsResponse | null>(null);

  // Real, server-computed aggregates — never hardcoded. A failed fetch simply
  // leaves the sections in their honest empty/loading state.
  useEffect(() => {
    let cancelled = false;
    landingService
      .getStats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {});
    landingService
      .getReviews()
      .then((r) => !cancelled && setReviews(r))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden relative">
      {/* Premium animated background */}
      <div className="fixed inset-0 z-0">
        <ParticleField />
      </div>

      <div className="relative z-10">
        <ScrollProgress />
        <Navbar />
        <HeroSection stats={stats} />
        <LogoMarquee />
        <StatsBar stats={stats} />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection reviews={reviews} />
        <EnterpriseSection stats={stats} />
        <PricingSection />
        <FinalCtaSection />
        <FooterSection />
      </div>
    </div>
  );
}
