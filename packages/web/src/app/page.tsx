"use client";

import { HeroSection } from "@/components/landing/HeroSection";
import { FeaturesSection } from "@/components/landing/FeaturesSection";
import { StatsSection } from "@/components/landing/StatsSection";
import { ShowcaseSection } from "@/components/landing/ShowcaseSection";
import { CTASection } from "@/components/landing/CTASection";
import { Footer } from "@/components/landing/Footer";

export default function Home() {
  return (
    <>
      <main className="min-h-screen">
        <HeroSection />
        <ShowcaseSection />
        <CTASection />
      </main>
      <Footer />
    </>
  );
}
