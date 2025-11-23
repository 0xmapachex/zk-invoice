"use client";

import { TrendingUp, Users, FileText, DollarSign } from "lucide-react";

const stats = [
  {
    icon: DollarSign,
    value: "$50M+",
    label: "Total Volume Processed",
    description: "Secure transactions"
  },
  {
    icon: FileText,
    value: "10,000+",
    label: "Invoices Created",
    description: "And growing daily"
  },
  {
    icon: Users,
    value: "2,500+",
    label: "Active Users",
    description: "Trust our platform"
  },
  {
    icon: TrendingUp,
    value: "99.9%",
    label: "Uptime Guaranteed",
    description: "Always available"
  }
];

const trustLogos = [
  { name: "Aztec Network", gradient: "from-blue-500 to-cyan-500" },
  { name: "Ethereum", gradient: "from-purple-500 to-indigo-500" },
  { name: "Zero Knowledge", gradient: "from-green-500 to-teal-500" },
  { name: "Web3", gradient: "from-orange-500 to-red-500" }
];

export const StatsSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-background relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20"></div>
      <div className="container mx-auto px-4 relative z-10">
        {/* Trust Badges */}
        <div className="text-center mb-16 opacity-0 animate-fade-in-up">
          <p className="text-sm text-muted-foreground uppercase tracking-wider mb-8 font-medium">
            Powered By Leading Web3 Technologies
          </p>
          <div className="flex flex-wrap justify-center items-center gap-8 lg:gap-12">
            {trustLogos.map((logo, index) => (
              <div
                key={index}
                className="group cursor-pointer"
              >
                <div className={`px-6 py-3 rounded-xl bg-gradient-to-r ${logo.gradient} opacity-60 group-hover:opacity-100 transition-opacity duration-300`}>
                  <span className="text-white font-semibold text-sm lg:text-base">
                    {logo.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 opacity-0 animate-fade-in-up animation-delay-200">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="text-center space-y-4 p-6 rounded-2xl bg-gradient-to-br from-card to-muted/20 border border-border/50 hover:border-primary/30 hover:shadow-xl hover:scale-105 transition-all duration-300 group cursor-pointer"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <stat.icon className="w-6 h-6 text-primary" />
              </div>
              <div>
                <div className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent mb-2 group-hover:scale-110 transition-transform duration-300">
                  {stat.value}
                </div>
                <div className="font-semibold text-foreground mb-1">
                  {stat.label}
                </div>
                <div className="text-sm text-muted-foreground">
                  {stat.description}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Trust Statement */}
        <div className="mt-16 text-center opacity-0 animate-fade-in-up animation-delay-400">
          <div className="inline-flex flex-col lg:flex-row items-center gap-8 lg:gap-12 text-muted-foreground">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">Trusted by businesses</div>
                <div className="text-sm">Processing payments daily</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div className="text-left">
                <div className="font-semibold text-foreground">On-time delivery</div>
                <div className="text-sm">Guaranteed or fees back</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

