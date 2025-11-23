"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Share2, ExternalLink, Loader2, CheckCircle } from "lucide-react";
import { formatUSDC, formatDate, truncateAddress } from "@/lib/utils";
import { getInvoiceById, markInvoicePaid } from "@/lib/api/client";
import { useWalletStore } from "@/stores/useWalletStore";
import { useInvoiceOnChain } from "@/hooks/useInvoiceOnChain";
import { useToast } from "@/hooks/useToast";
import type { Invoice } from "@/types/invoice";
import type { PaymentStatus } from "@/types/invoice";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const { role, buyerAddress } = useWalletStore();
  const { payInvoice, isPaying } = useInvoiceOnChain();
  const { toast } = useToast();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle");
  
  useEffect(() => {
    loadInvoice();
  }, [invoiceId]);
  
  const loadInvoice = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await getInvoiceById(invoiceId);
      setInvoice(data);
    } catch (err) {
      console.error("Failed to load invoice:", err);
      setError(err instanceof Error ? err.message : "Failed to load invoice");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handlePayment = async () => {
    if (!invoice || !buyerAddress) {
      toast.error("Wallet Error", "Please connect your wallet as a buyer");
      return;
    }
    
    try {
      setPaymentStatus("checking-balance");
      toast.info("Processing Payment", "Checking your balance...");
      
      // Convert amount string to bigint
      const amount = BigInt(invoice.amount);
      
      setPaymentStatus("creating-authwit");
      toast.info("Creating Authorization", "Generating payment authorization...");
      
      // Pay invoice on-chain
      setPaymentStatus("submitting");
      toast.info("Submitting Payment", "Sending transaction to blockchain...");
      
      const result = await payInvoice({
        invoiceId: invoice.invoiceId,
        partialNoteHash: invoice.partialNoteHash,
        tokenAddress: invoice.tokenAddress,
        amount,
      });
      
      setPaymentStatus("confirming");
      toast.info("Confirming", "Waiting for blockchain confirmation...");
      
      // Wait a bit for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mark as paid in API
      await markInvoicePaid(invoice.invoiceId);
      
      setPaymentStatus("success");
      toast.success("Payment Successful!", `Your payment has been processed. Tx: ${result.txHash}`);
      
      // Reload invoice data
      await loadInvoice();
      
      // Reset status after showing success
      setTimeout(() => setPaymentStatus("idle"), 3000);
    } catch (err) {
      console.error("Payment failed:", err);
      setPaymentStatus("error");
      toast.error(
        "Payment Failed",
        err instanceof Error ? err.message : "Unable to process payment. Please try again."
      );
      setTimeout(() => setPaymentStatus("idle"), 3000);
    }
  };
  
  const handleDownloadPDF = () => {
    // TODO: Implement PDF download
    toast.info("Coming Soon", "PDF download feature will be available soon");
  };
  
  const handleShare = () => {
    if (invoice) {
      const url = `${window.location.origin}/invoice/${invoice.invoiceId}`;
      navigator.clipboard.writeText(url);
      toast.success("Link Copied!", "Invoice link has been copied to clipboard");
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl space-y-6">
        <Skeleton className="h-12 w-3/4" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }
  
  if (error || !invoice) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h2 className="text-lg font-semibold">Invoice Not Found</h2>
              <p className="text-sm text-muted-foreground mt-1">
                {error || "The invoice you're looking for doesn't exist"}
              </p>
              <Button onClick={() => router.push("/")} className="mt-4">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const amount = typeof invoice.amount === "bigint" ? invoice.amount : BigInt(invoice.amount);
  
  // Parse metadata if available
  let metadata;
  try {
    metadata = invoice.metadata ? JSON.parse(invoice.metadata) : null;
  } catch {
    metadata = null;
  }
  
  const canPay = role === "buyer" && invoice.status === "pending" && paymentStatus === "idle";
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold">Invoice</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-muted-foreground mt-1">
            #{truncateAddress(invoice.invoiceId, 12, 8)}
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>
      
      {/* Invoice Details */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Bill From */}
            <div>
              <h3 className="font-semibold mb-2">Bill From</h3>
              <p className="text-sm font-mono">{truncateAddress(invoice.senderAddress)}</p>
              {metadata?.clientCompany && (
                <p className="text-sm text-muted-foreground mt-1">{metadata.clientCompany}</p>
              )}
            </div>
            
            {/* Bill To */}
            <div>
              <h3 className="font-semibold mb-2">Bill To</h3>
              {metadata?.clientName && (
                <p className="text-sm">{metadata.clientName}</p>
              )}
              {metadata?.clientEmail && (
                <p className="text-sm text-muted-foreground">{metadata.clientEmail}</p>
              )}
            </div>
          </div>
          
          <div className="border-t mt-6 pt-6 grid md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Date of Issue</p>
              <p className="font-medium">{formatDate(invoice.createdAt)}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invoice Title</p>
              <p className="font-medium">{invoice.title}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Token</p>
              <p className="font-mono text-sm">{truncateAddress(invoice.tokenAddress)}</p>
            </div>
          </div>
          
          {metadata?.memo && (
            <div className="border-t mt-6 pt-6">
              <p className="text-sm text-muted-foreground mb-1">Memo</p>
              <p className="text-sm">{metadata.memo}</p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Line Items (if available) */}
      {metadata?.lineItems && metadata.lineItems.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metadata.lineItems.map((item: any, index: number) => (
                <div key={index} className="flex justify-between items-start pb-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity} × ${item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    ${(item.quantity * item.unitPrice).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Total */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              <p className="text-3xl font-bold mt-1">{formatUSDC(amount)}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Status</p>
              <StatusBadge status={invoice.status} className="mt-1" />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Payment Section */}
      {canPay && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-semibold mb-2">Ready to Pay?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This will transfer {formatUSDC(amount)} to the invoice sender
              </p>
              <Button size="lg" onClick={handlePayment} disabled={paymentStatus !== "idle"}>
                {paymentStatus === "idle" && "Pay Invoice"}
                {paymentStatus === "checking-balance" && (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Checking balance...
                  </>
                )}
                {paymentStatus === "creating-authwit" && (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating authorization...
                  </>
                )}
                {paymentStatus === "submitting" && (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting payment...
                  </>
                )}
                {paymentStatus === "confirming" && (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Confirming on blockchain...
                  </>
                )}
                {paymentStatus === "success" && (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Payment Successful!
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* View on Blockchain */}
      <div className="text-center mt-6">
        <Button variant="link" size="sm">
          <ExternalLink className="h-4 w-4 mr-2" />
          View on Blockchain Explorer
        </Button>
      </div>
    </div>
  );
}

