"use client";

import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";

export const CTASection = () => {
  const router = useRouter();

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-primary/5 via-background to-purple-500/5 relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-dots-pattern opacity-20"></div>
      <div className="absolute top-1/2 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 animate-float"></div>
      <div className="absolute top-1/2 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 animate-float animation-delay-400"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Heading */}
          <div className="space-y-4 opacity-0 animate-fade-in-up">
            <h2 className="text-3xl font-bold tracking-tight lg:text-5xl">
              Ready to transform your invoice management?
            </h2>
            <p className="text-lg text-muted-foreground lg:text-xl max-w-2xl mx-auto">
              Join thousands of businesses using zero-knowledge technology for secure, private invoice management. Get started in minutes.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap justify-center gap-4 opacity-0 animate-fade-in-up animation-delay-200">
            <Button
              size="lg"
              onClick={() => router.push("/dashboard")}
              className="text-base px-8 h-12 group shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300"
            >
              Get Started Now
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => router.push("/create")}
              className="text-base px-8 h-12 hover:scale-110 hover:border-primary/50 transition-all duration-300"
            >
              Create Your First Invoice
            </Button>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-wrap justify-center items-center gap-8 pt-8 text-sm text-muted-foreground opacity-0 animate-fade-in-up animation-delay-400">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>No credit card required</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Free to start</span>
            </div>
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

