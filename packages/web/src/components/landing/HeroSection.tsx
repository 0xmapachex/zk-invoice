"use client";

import Image from "next/image";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { Shield, Zap, Lock } from "lucide-react";

export const HeroSection = () => {
  const router = useRouter();

  const handleGetStarted = () => {
    router.push("/dashboard");
  };

  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-background via-background to-primary/5 min-h-screen flex items-center">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 bg-grid-pattern opacity-50"></div>
      <div className="absolute top-20 right-0 w-[30rem] h-[30rem] bg-primary/10 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-0 w-[25rem] h-[25rem] bg-purple-500/10 rounded-full blur-3xl animate-float animation-delay-400"></div>
      
      <div className="container mx-auto px-4 py-24 lg:py-32 relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            {/* Headline */}
            <div className="space-y-4 opacity-0 animate-fade-in-up animation-delay-200">
              <h1 className="text-4xl font-bold tracking-tight lg:text-6xl leading-tight">
                Create invoices with{" "}
                <span className="text-primary">zero-knowledge</span> privacy
              </h1>
              <p className="text-lg text-muted-foreground lg:text-xl max-w-2xl">
                Manage your invoices securely with blockchain technology. Full privacy protection using zero-knowledge proofs while maintaining complete transparency.
              </p>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap gap-4 opacity-0 animate-fade-in-up animation-delay-400">
              <Button
                size="lg"
                onClick={handleGetStarted}
                className="text-base px-8 h-12"
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push("/create")}
                className="text-base px-8 h-12"
              >
                Create Invoice
              </Button>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap gap-8 pt-4 opacity-0 animate-fade-in-up animation-delay-600">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Bank-level security</div>
                  <div className="text-sm text-muted-foreground">256-bit encryption</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Lock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Full privacy</div>
                  <div className="text-sm text-muted-foreground">Zero-knowledge proofs</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <div className="font-semibold text-foreground">Instant settlement</div>
                  <div className="text-sm text-muted-foreground">Real-time processing</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Visual - Invoice Preview Mockup */}
          <div className="relative opacity-0 animate-fade-in-left animation-delay-400">
            <div className="relative rounded-2xl bg-card/80 backdrop-blur-xl border shadow-2xl p-6 lg:p-8 transform lg:rotate-2 hover:rotate-0 transition-all duration-500 hover:shadow-3xl hover:scale-105">
              {/* Mock Invoice Preview */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 relative">
                      <Image
                        src="/logo.png"
                        alt="ZK Invoice"
                        width={40}
                        height={40}
                        className="object-contain"
                      />
                    </div>
                    <div>
                      <div className="font-semibold">Invoice #INV-001</div>
                      <div className="text-sm text-muted-foreground">Privacy Protected</div>
                    </div>
                  </div>
                  <div className="rounded-full bg-green-500/10 px-3 py-1 text-sm font-medium text-green-600">
                    Paid
                  </div>
                </div>

                <div className="space-y-4 border-t pt-6">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-mono font-semibold">$12,500.00</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Token</span>
                    <span className="font-medium">USDC</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                      <span className="font-medium">Completed</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-6">
                  <Button className="w-full" variant="outline">
                    View Transaction Details
                  </Button>
                </div>

                {/* Privacy Badge */}
                <div className="flex items-center justify-center gap-2 rounded-lg bg-primary/5 py-3 px-4">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium text-primary">
                    Protected by Zero-Knowledge Cryptography
                  </span>
                </div>
              </div>
            </div>

            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-primary/10 blur-2xl"></div>
            <div className="absolute -bottom-4 -left-4 w-32 h-32 rounded-full bg-purple-500/10 blur-2xl"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

