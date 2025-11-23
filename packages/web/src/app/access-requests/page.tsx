"use client";

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { AccessRequestsPanel } from "@/components/access/AccessRequestsPanel";
import { useWalletStore } from "@/stores/useWalletStore";

export default function AccessRequestsPage() {
  const router = useRouter();
  const { role } = useWalletStore();
  
  // Use the actual blockchain addresses from created invoices
  // In production, get from actual wallet
  const mockAddresses = {
    seller: "0x11deabd59b872d17c737b66f61d332230f341e774c6b5d3762f46a74536f947f", // Real sender address
    buyer: "0x19d4aaf4040b2577a1f1ca3b05ab3274eb2158c64d79361e40681c3877be8fed",
  };
  const ownerAddress = mockAddresses[role];
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/[0.02] to-purple-500/[0.03] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-dots-pattern opacity-30"></div>
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float animation-delay-400"></div>
      
      <div className="container mx-auto py-8 px-4 max-w-5xl relative z-10">
        {/* Back Button & Header */}
        <div className="mb-8 opacity-0 animate-fade-in-down">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="mb-4 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Compliance Access Requests
          </h1>
          <p className="text-muted-foreground mt-2">
            Review and manage access requests for your invoices
          </p>
        </div>

        <div className="opacity-0 animate-fade-in-up animation-delay-200">
          <AccessRequestsPanel ownerAddress={ownerAddress} />
        </div>
      </div>
    </div>
  );
}

