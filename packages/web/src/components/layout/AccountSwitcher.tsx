"use client";

import { Button } from "@/components/ui/button";
import { useWalletStore, type AccountRole } from "@/stores/useWalletStore";
import { User, Users } from "lucide-react";

export function AccountSwitcher() {
  const { role, switchRole } = useWalletStore();
  
  const handleSwitch = () => {
    const newRole: AccountRole = role === "seller" ? "buyer" : "seller";
    switchRole(newRole);
  };
  
  return (
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
  );
}

