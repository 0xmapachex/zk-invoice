"use client";

import { Shield, Eye, Zap, Lock, FileCheck, Globe } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Zero-Knowledge Privacy",
    description: "Your financial data stays private with cutting-edge zero-knowledge proof technology. Nobody can see your transaction details except you.",
    color: "from-blue-500 to-cyan-500"
  },
  {
    icon: Eye,
    title: "Complete Transparency",
    description: "Verify all transactions on-chain while maintaining privacy. Full audit trail without compromising sensitive information.",
    color: "from-purple-500 to-pink-500"
  },
  {
    icon: Zap,
    title: "Instant Settlement",
    description: "Get paid instantly with blockchain technology. No waiting for bank transfers or dealing with payment processors.",
    color: "from-orange-500 to-red-500"
  },
  {
    icon: Lock,
    title: "Bank-Grade Security",
    description: "Military-grade encryption and decentralized architecture ensure your invoices and payments are always secure.",
    color: "from-green-500 to-emerald-500"
  },
  {
    icon: FileCheck,
    title: "Smart Contract Automation",
    description: "Automated payment verification and invoice tracking. No manual reconciliation or administrative overhead.",
    color: "from-indigo-500 to-blue-500"
  },
  {
    icon: Globe,
    title: "Global Payments",
    description: "Accept payments from anywhere in the world with stablecoins. No currency conversion fees or international transfer delays.",
    color: "from-teal-500 to-cyan-500"
  }
];

export const FeaturesSection = () => {
  return (
    <section className="py-16 lg:py-24 bg-muted/30 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-dots-pattern opacity-20"></div>
      <div className="container mx-auto px-4 relative z-10">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 opacity-0 animate-fade-in-up">
          <h2 className="text-3xl font-bold tracking-tight lg:text-5xl mb-4">
            Why Choose <span className="text-primary">ZK Invoice</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Built on cutting-edge blockchain technology to provide the most secure, private, and efficient invoicing solution available.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3 opacity-0 animate-fade-in-up animation-delay-200">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-8 hover:shadow-2xl hover:border-primary/30 transition-all duration-300 hover:-translate-y-2 cursor-pointer overflow-hidden"
            >
              {/* Icon */}
              <div className="mb-6">
                <div className={`inline-flex p-3 rounded-xl bg-gradient-to-br ${feature.color} shadow-lg`}>
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
              </div>

              {/* Content */}
              <h3 className="text-xl font-semibold mb-3 group-hover:text-primary transition-colors">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Effect */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-300 -z-10"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

