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
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          {role === "seller" ? "My Invoices" : "Invoices to Pay"}
        </h1>
        <p className="text-muted-foreground mt-1">
          {role === "seller" 
            ? "Manage your sent invoices and track payments" 
            : "View and pay your pending invoices"
          }
        </p>
      </div>
      
      {/* Stats Cards */}
      {!isLoading && <InvoiceStats invoices={filteredInvoices} currentBalance={currentBalance} />}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      )}
      
      {/* Filter and Search */}
      <InvoiceFilter />
      
      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}
      
      {/* Invoice Table */}
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
  );
}

