"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "./StatusBadge";
import { Eye, Download, Trash2, DollarSign, Lock } from "lucide-react";
import { formatUSDC, formatDate, truncateAddress } from "@/lib/utils";
import { useWalletStore } from "@/stores/useWalletStore";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/types/invoice";

interface InvoiceTableProps {
  invoices: Invoice[];
  onDelete?: (invoice: Invoice) => void;
  onPay?: (invoice: Invoice) => void;
}

export function InvoiceTable({ invoices, onDelete, onPay }: InvoiceTableProps) {
  const router = useRouter();
  const { role } = useWalletStore();
  
  const handleView = (invoice: Invoice) => {
    router.push(`/invoice/${invoice.invoiceId}`);
  };
  
  const handleDownload = (invoice: Invoice) => {
    // TODO: Implement PDF download
    console.log("Download invoice:", invoice.invoiceId);
  };
  
  if (invoices.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-12 bg-card/50 backdrop-blur-sm">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 mx-auto flex items-center justify-center">
            <Eye className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">No invoices found</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {role === "seller" 
                ? "Create your first invoice to get started"
                : "No invoices received yet"
              }
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="rounded-xl border border-border/50 overflow-hidden bg-card/50 backdrop-blur-sm shadow-lg">
      <Table>
        <TableHeader className="bg-muted/30">
          <TableRow className="hover:bg-transparent">
            <TableHead>Invoice No.</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Title</TableHead>
            {role === "seller" && <TableHead>From</TableHead>}
            <TableHead>Amount</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {invoices.map((invoice) => {
            const amount = typeof invoice.amount === "bigint"
              ? invoice.amount
              : BigInt(invoice.amount);
              
            return (
              <TableRow 
                key={invoice.invoiceId}
                className="hover:bg-muted/30 transition-colors duration-200 cursor-pointer group"
                onClick={() => handleView(invoice)}
              >
                <TableCell className="font-mono text-sm">
                  #{truncateAddress(invoice.invoiceId, 8, 6)}
                </TableCell>
                <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                <TableCell className="font-medium">{invoice.title}</TableCell>
                {role === "seller" && (
                  <TableCell className="font-mono text-sm">
                    {truncateAddress(invoice.senderAddress)}
                  </TableCell>
                )}
                <TableCell className="font-semibold">
                  {formatUSDC(amount)}
                </TableCell>
                <TableCell>
                  <StatusBadge status={invoice.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleView(invoice)}
                      title="View details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDownload(invoice)}
                      title="Download PDF"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {role === "buyer" && invoice.status === "pending" && onPay && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onPay(invoice)}
                      >
                        <DollarSign className="h-4 w-4 mr-1" />
                        Pay
                      </Button>
                    )}
                    {role === "seller" && onDelete && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(invoice)}
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

