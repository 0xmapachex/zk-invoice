"use client";

import Link from "next/link";
import { AccountSwitcher } from "./AccountSwitcher";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/useWalletStore";
import { useToast } from "@/hooks/useToast";
import { Wallet, Menu } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import { useState } from "react";

export function Header() {
  const { isConnected, currentAddress, connect, role } = useWalletStore();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleConnect = async () => {
    try {
      await connect();
      toast.success("Wallet Connected", "Your wallet has been connected successfully");
    } catch (error) {
      console.error("Failed to connect:", error);
      toast.error("Connection Failed", "Unable to connect wallet. Please try again.");
    }
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">ZK</span>
            </div>
            <span className="hidden font-bold sm:inline-block">
              ZK Invoice
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link 
              href="/" 
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Dashboard
            </Link>
            {role === "seller" && (
              <Link 
                href="/create" 
                className="text-sm font-medium transition-colors hover:text-primary"
              >
                Create Invoice
              </Link>
            )}
          </nav>
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Account Switcher */}
          <div className="hidden sm:block">
            <AccountSwitcher />
          </div>
          
          {/* Wallet Connection */}
          <div className="flex items-center gap-2">
            {isConnected && currentAddress ? (
              <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono">
                  {truncateAddress(currentAddress)}
                </span>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleConnect}>
                <Wallet className="h-4 w-4 mr-2" />
                Connect
              </Button>
            )}
          </div>
          
          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t md:hidden">
          <div className="container mx-auto px-4 py-4 space-y-4">
            <AccountSwitcher />
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className="text-sm font-medium px-2 py-1 hover:bg-accent rounded-md"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              {role === "seller" && (
                <Link
                  href="/create"
                  className="text-sm font-medium px-2 py-1 hover:bg-accent rounded-md"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Create Invoice
                </Link>
              )}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
}

