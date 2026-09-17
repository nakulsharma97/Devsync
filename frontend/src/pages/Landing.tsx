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
  // Distinguishes "still loading" from "loaded and unavailable" so stats
  // placeholders can stop animating once the request settles either way.
  const [statsSettled, setStatsSettled] = useState(false);
  const [reviews, setReviews] = useState<PublicReviewsResponse | null>(null);
  const [reviewsSettled, setReviewsSettled] = useState(false);

  // Real, server-computed aggregates — never hardcoded. A failed fetch simply
  // leaves the sections in their honest empty state.
  useEffect(() => {
    let cancelled = false;
    landingService
      .getStats()
      .then((s) => !cancelled && setStats(s))
      .catch(() => {})
      .finally(() => !cancelled && setStatsSettled(true));
    landingService
      .getReviews()
      .then((r) => !cancelled && setReviews(r))
      .catch(() => {})
      .finally(() => !cancelled && setReviewsSettled(true));
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
        <StatsBar stats={stats} settled={statsSettled} />
        <FeaturesSection />
        <HowItWorksSection />
        <TestimonialsSection reviews={reviews} settled={reviewsSettled} />
        <EnterpriseSection stats={stats} />
        <PricingSection />
        <FinalCtaSection />
        <FooterSection />
      </div>
    </div>
  );
}
