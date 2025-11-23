"use client";

import { useEffect, useState } from "react";
import { InvoiceStats } from "@/components/invoice/InvoiceStats";
import { InvoiceFilter } from "@/components/invoice/InvoiceFilter";
import { InvoiceTable } from "@/components/invoice/InvoiceTable";
import { useInvoiceStore } from "@/stores/useInvoiceStore";
import { useWalletStore } from "@/stores/useWalletStore";
import { getInvoices } from "@/lib/api/client";
import { getPrivateBalance } from "@/lib/aztec/balance";
import deploymentsData from "@/lib/data/deployments.json";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();
  const { role, currentAddress, isConnected, connect } = useWalletStore();
  const { 
    setInvoices, 
    getFilteredInvoices, 
    setLoading, 
    setError, 
    isLoading,
    error 
  } = useInvoiceStore();
  
  const [mounted, setMounted] = useState(false);
  const [currentBalance, setCurrentBalance] = useState<bigint | undefined>(undefined);
  
  // Auto-connect wallet on mount
  useEffect(() => {
    if (!isConnected) {
      connect().catch(console.error);
    }
  }, []);
  
  // Load invoices on mount and when role changes
  useEffect(() => {
    setMounted(true);
    if (isConnected) {
      loadInvoices();
      loadBalance();
    }
  }, [role, currentAddress, isConnected]);
  
  const loadBalance = async () => {
    if (!currentAddress) return;
    
    try {
      const tokenAddress = deploymentsData.usdc?.address || "0x0";
      const balance = await getPrivateBalance(tokenAddress, currentAddress);
      setCurrentBalance(balance);
    } catch (err) {
      console.error("Failed to fetch balance:", err);
      setCurrentBalance(BigInt(0));
    }
  };
  
  const loadInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch invoices based on current role
      const filters = role === "seller" && currentAddress 
        ? { sender: currentAddress }
        : {};
      
      const invoices = await getInvoices(filters);
      setInvoices(invoices);
    } catch (err) {
      console.error("Failed to load invoices:", err);
      setError(err instanceof Error ? err.message : "Failed to load invoices");
      // Use mock data for demo purposes when API is not available
      setInvoices([]);
    } finally {
      setLoading(false);
    }
  };
  
  const filteredInvoices = mounted ? getFilteredInvoices() : [];
  
  const handleDelete = async (invoice: any) => {
    // TODO: Implement delete functionality
    console.log("Delete invoice:", invoice.invoiceId);
  };
  
  const handlePay = async (invoice: any) => {
    // Navigate to invoice detail page to pay
    router.push(`/invoice/${invoice.invoiceId}`);
  };
  
  if (!mounted) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-8">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/[0.02] to-purple-500/[0.03] relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 bg-dots-pattern opacity-30"></div>
      <div className="absolute top-20 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-float"></div>
      <div className="absolute bottom-20 left-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl animate-float animation-delay-400"></div>
      
      <div className="container mx-auto py-8 px-4 lg:px-6 space-y-8 relative z-10">
        {/* Page Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between opacity-0 animate-fade-in-down">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
              {role === "seller" ? "My Invoices" : "Invoices to Pay"}
            </h1>
            <p className="text-muted-foreground mt-2 text-base">
              {role === "seller" 
                ? "Manage your sent invoices and track payments" 
                : "View and pay your pending invoices"
              }
            </p>
          </div>
          
          {role === "seller" && (
            <Button
              size="lg"
              onClick={() => router.push("/create")}
              className="shadow-lg hover:shadow-xl transition-all"
            >
              <svg className="w-5 h-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Create New Invoice
            </Button>
          )}
        </div>
      
      {/* Stats Cards */}
      {!isLoading && (
        <div className="opacity-0 animate-fade-in-up animation-delay-200">
          <InvoiceStats invoices={filteredInvoices} currentBalance={currentBalance} />
        </div>
      )}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}
      
      {/* Filter and Search */}
      <div className="opacity-0 animate-fade-in-up animation-delay-400">
        <InvoiceFilter />
      </div>
      
      {/* Error Message */}
      {error && (
        <div className="rounded-xl border border-destructive bg-destructive/10 p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-sm font-medium text-destructive">Error loading invoices</p>
              <p className="text-sm text-destructive/80 mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Invoice Table */}
      <div className="opacity-0 animate-fade-in-up animation-delay-600">
        {isLoading ? (
          <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : (
        <InvoiceTable 
          invoices={filteredInvoices} 
          onDelete={role === "seller" ? handleDelete : undefined}
          onPay={role === "buyer" ? handlePay : undefined}
        />
        )}
      </div>
      </div>
    </div>
  );
}

