"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useInvoiceStore } from "@/stores/useInvoiceStore";
import { useWalletStore } from "@/stores/useWalletStore";
import { useRouter } from "next/navigation";

const FILTER_TABS = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Unpaid", value: "pending" },
] as const;

export function InvoiceFilter() {
  const router = useRouter();
  const { role } = useWalletStore();
  const { filters, setFilters } = useInvoiceStore();
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };
  
  const handleTabChange = (value: typeof filters.status) => {
    setFilters({ status: value });
  };
  
  const handleCreateInvoice = () => {
    router.push("/create");
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {FILTER_TABS.map((tab) => (
            <Button
              key={tab.value}
              variant={filters.status === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => handleTabChange(tab.value)}
            >
              {tab.label}
            </Button>
          ))}
        </div>
        
        {role === "seller" && (
          <Button onClick={handleCreateInvoice}>
            <Plus className="h-4 w-4 mr-2" />
            Create Invoice
          </Button>
        )}
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search invoices..."
          value={filters.search || ""}
          onChange={handleSearch}
          className="pl-10"
        />
      </div>
    </div>
  );
}

