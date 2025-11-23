"use client";

import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

export const ShowcaseSection = () => {
  const router = useRouter();

  const transactionSteps = [
    { time: "Monday, November 23 at 10:35 AM", text: "Invoice created", status: "completed" },
    { time: "Monday, November 23 at 10:35 AM", text: "Sent to recipient", status: "completed" },
    { time: "Monday, November 23 at 10:35 AM", text: "Payment received", status: "completed" },
    { time: "Monday, November 23 at 10:36 AM", text: "Transaction successfully verified", status: "completed" }
  ];

  return (
    <section className="py-16 lg:py-24 bg-gradient-to-br from-primary via-primary to-primary/90 text-primary-foreground relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
      <div className="absolute top-20 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-float animation-delay-400"></div>
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="space-y-8 opacity-0 animate-fade-in-right animation-delay-200">
            {/* Ratings */}
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 text-yellow-300 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white/90">
                  <span className="font-semibold">4.7</span> ★ on Privacy Rating 352K reviews
                </span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 backdrop-blur-sm">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg
                      key={i}
                      className="w-4 h-4 text-yellow-300 fill-current"
                      viewBox="0 0 20 20"
                    >
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-white/90">
                  <span className="font-semibold">4.8</span> ★ on Security 100K reviews
                </span>
              </div>
            </div>

            {/* Headline */}
            <div className="space-y-4">
              <h2 className="text-4xl font-bold tracking-tight lg:text-5xl">
                Private invoice management
              </h2>
              <p className="text-lg text-primary-foreground/80 max-w-xl">
                Create and manage invoices with zero-knowledge privacy — while maintaining complete transparency with fees as low as 0.1%.
              </p>
            </div>

            {/* CTA */}
            <div>
              <Button
                size="lg"
                className="bg-yellow-400 text-gray-900 hover:bg-yellow-300 font-semibold text-base px-8 h-12"
                onClick={() => router.push("/dashboard")}
              >
                Open an account
              </Button>
            </div>

            {/* Visual Data Preview */}
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <span className="text-sm text-white/70">Rate guaranteed (24h)</span>
                <span className="font-mono font-semibold">1 USD = 1.0 USDC</span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-white/70">You send exactly</span>
                  <span className="font-mono font-semibold">100,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/70">Recipient gets</span>
                  <span className="font-mono font-semibold text-2xl">66,261.50</span>
                </div>
              </div>
              <div className="border-t border-white/10 pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Delivery Method</span>
                  <span className="font-medium">Bank Deposit</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Our fee</span>
                  <span className="font-medium">$1.05</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-white/70">Total</span>
                  <span className="font-semibold">66,261.50</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Transaction Timeline */}
          <div className="relative opacity-0 animate-fade-in-left animation-delay-400">
            <div className="bg-background text-foreground rounded-2xl shadow-2xl p-6 lg:p-8 border border-border/50 backdrop-blur-xl hover:shadow-3xl hover:scale-105 transition-all duration-500">
              {/* Header */}
              <div className="flex items-center justify-between mb-8 pb-6 border-b">
                <div className="flex items-center gap-3">
                  <ArrowRight className="w-5 h-5" />
                  <h3 className="text-xl font-bold">Transaction Details</h3>
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center gap-4 mb-8 p-4 rounded-xl bg-muted/50">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-lg">
                  DO
                </div>
                <div className="flex-1">
                  <div className="font-semibold">Dennis Oswald</div>
                  <div className="text-sm text-muted-foreground">Invoice #INV-2024-001</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold">100,000 AUD</div>
                  <div className="text-sm text-muted-foreground">You sent AUD</div>
                </div>
              </div>

              {/* Status Tabs */}
              <div className="flex gap-4 mb-6 border-b">
                <button className="pb-3 px-1 border-b-2 border-primary font-medium text-primary">
                  Updates
                </button>
                <button className="pb-3 px-1 text-muted-foreground hover:text-foreground transition-colors">
                  Details
                </button>
              </div>

              {/* Timeline */}
              <div className="space-y-4">
                {transactionSteps.map((step, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                      </div>
                      {index < transactionSteps.length - 1 && (
                        <div className="w-0.5 h-full bg-border my-1 flex-1 min-h-8"></div>
                      )}
                    </div>
                    <div className="flex-1 pb-4">
                      <div className="font-medium mb-1">{step.text}</div>
                      <div className="text-sm text-muted-foreground">{step.time}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Success Message */}
              <div className="mt-6 p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-green-700 dark:text-green-400 mb-1">
                      Transfer successfully sent
                    </div>
                    <div className="text-sm text-green-600/80 dark:text-green-400/80">
                      Your invoice has been paid and verified on-chain. Both parties have been notified.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/5 rounded-full blur-3xl"></div>
    </section>
  );
};

