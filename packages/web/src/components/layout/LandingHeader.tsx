"use client";

import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export const LandingHeader = () => {
  return (
    <header className="absolute top-0 left-0 right-0 z-50 w-full">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="h-10 w-10 relative transition-all duration-300 group-hover:scale-105">
            <Image
              src="/logo.png"
              alt="ZK Invoice Logo"
              width={40}
              height={40}
              className="object-contain"
            />
          </div>
          <span className="font-bold text-xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            ZK Invoice
          </span>
        </Link>
        
        {/* CTA Button */}
        <Button 
          asChild
          size="lg"
          className="group shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Link href="/dashboard" className="flex items-center gap-2">
            Go to App
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </Button>
      </div>
    </header>
  );
};

