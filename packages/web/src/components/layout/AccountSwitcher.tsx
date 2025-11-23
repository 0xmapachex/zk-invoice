"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useWalletStore, type AccountRole } from "@/stores/useWalletStore";
import { User, Users, Wallet, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/useToast";
import deploymentsData from "@/lib/data/deployments.json";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export function AccountSwitcher() {
  const { role, switchRole } = useWalletStore();
  const { toast } = useToast();
  const [isMinting, setIsMinting] = useState(false);
  
  const handleSwitch = () => {
    const newRole: AccountRole = role === "seller" ? "buyer" : "seller";
    switchRole(newRole);
  };
  
  const handleFundAccount = async () => {
    setIsMinting(true);
    
    try {
      const tokenAddress = deploymentsData.usdc?.address;
      
      if (!tokenAddress) {
        throw new Error("Token address not found in deployments");
      }

      toast.info("Minting Tokens", "Sending mint transaction...");

      const response = await fetch(`${API_URL}/blockchain/mint`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tokenAddress,
          recipientRole: role,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to mint tokens");
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Failed to mint tokens");
      }

      // Convert amount to human readable (assuming 6 decimals for USDC)
      const amountInUSDC = Number(result.data.amount) / 1_000_000;

      toast.success(
        "Tokens Minted!",
        `Successfully minted ${amountInUSDC.toLocaleString()} USDC to your ${role} account`
      );
    } catch (error) {
      console.error("Error minting tokens:", error);
      toast.error(
        "Minting Failed",
        error instanceof Error ? error.message : "Failed to mint tokens"
      );
    } finally {
      setIsMinting(false);
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 border rounded-lg p-1">
        <Button
          variant={role === "seller" ? "default" : "ghost"}
          size="sm"
          onClick={handleSwitch}
          className="gap-2"
        >
          <User className="h-4 w-4" />
          Seller
        </Button>
        <Button
          variant={role === "buyer" ? "default" : "ghost"}
          size="sm"
          onClick={handleSwitch}
          className="gap-2"
        >
          <Users className="h-4 w-4" />
          Buyer
        </Button>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleFundAccount}
        disabled={isMinting}
        className="gap-2"
      >
        {isMinting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Minting...
          </>
        ) : (
          <>
            <Wallet className="h-4 w-4" />
            Fund Account
          </>
        )}
      </Button>
    </div>
  );
}

