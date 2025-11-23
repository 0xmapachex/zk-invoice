"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AccountSwitcher } from "./AccountSwitcher";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/useWalletStore";
import { useToast } from "@/hooks/useToast";
import { Wallet, Menu, X, LayoutDashboard, FileText, Home, PlusCircle } from "lucide-react";
import { truncateAddress } from "@/lib/utils";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const AppHeader = () => {
  const pathname = usePathname();
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

  const navItems = [
    { href: "/", label: "Home", icon: Home, showAlways: true },
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, showAlways: true },
    { href: "/create", label: "Create", icon: PlusCircle, showAlways: false, roleRequired: "seller" as const },
  ];

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };
  
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 lg:px-6">
        {/* Logo */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="h-9 w-9 relative transition-all duration-300 group-hover:scale-105">
              <Image
                src="/logo.png"
                alt="ZK Invoice Logo"
                width={36}
                height={36}
                className="object-contain"
              />
            </div>
            <span className="hidden font-bold text-lg sm:inline-block bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              ZK Invoice
            </span>
          </Link>
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-2">
            {navItems.map((item) => {
              const shouldShow = item.showAlways || (item.roleRequired && role === item.roleRequired);
              if (!shouldShow) return null;
              
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link 
                  key={item.href}
                  href={item.href} 
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200",
                    active 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "text-muted-foreground hover:text-foreground hover:bg-accent"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        
        {/* Right side */}
        <div className="flex items-center gap-3">
          {/* Account Switcher - Desktop */}
          <div className="hidden lg:block">
            <AccountSwitcher />
          </div>
          
          {/* Wallet Connection */}
          <div className="flex items-center gap-2">
            {isConnected && currentAddress ? (
              <div className="flex items-center gap-2 rounded-lg bg-accent/50 border border-border/50 px-3 py-2 shadow-sm">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <Wallet className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-mono font-medium hidden sm:inline">
                  {truncateAddress(currentAddress)}
                </span>
              </div>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleConnect}
                className="shadow-sm hover:shadow-md transition-all"
              >
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
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t md:hidden bg-background/95 backdrop-blur-xl">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {/* Account Switcher - Mobile */}
            <div className="lg:hidden pb-4 border-b">
              <AccountSwitcher />
            </div>
            
            {/* Navigation Links */}
            <nav className="flex flex-col gap-2">
              {navItems.map((item) => {
                const shouldShow = item.showAlways || (item.roleRequired && role === item.roleRequired);
                if (!shouldShow) return null;
                
                const Icon = item.icon;
                const active = isActive(item.href);
                
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all",
                      active
                        ? "bg-primary text-primary-foreground shadow-md"
                        : "text-muted-foreground hover:text-foreground hover:bg-accent"
                    )}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
      )}
    </header>
  );
};

