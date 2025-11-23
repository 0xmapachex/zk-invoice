"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/invoice/StatusBadge";
import { TransactionProgress } from "@/components/invoice/TransactionProgress";
import { Skeleton } from "@/components/ui/skeleton";
import { Download, Share2, ExternalLink, Loader2, ArrowLeft, Lock, Shield } from "lucide-react";
import { formatUSDC, formatDate, truncateAddress } from "@/lib/utils";
import { getInvoiceById, markInvoicePaid } from "@/lib/api/client";
import { useWalletStore } from "@/stores/useWalletStore";
import { useInvoiceOnChain } from "@/hooks/useInvoiceOnChain";
import { useToast } from "@/hooks/useToast";
import { checkInvoiceAccess, logInvoiceAccess } from "@/lib/api/access";
import { ComplianceRequestDialog } from "@/components/access/ComplianceRequestDialog";
import { AccessLogViewer } from "@/components/access/AccessLogViewer";
import type { Invoice } from "@/types/invoice";
import type { PaymentStatus } from "@/types/invoice";

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.id as string;
  const { role, buyerAddress } = useWalletStore();
  const { payInvoice } = useInvoiceOnChain();
  const { toast } = useToast();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("idle" as PaymentStatus);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [showProgress, setShowProgress] = useState(false);
  const [hasAccess, setHasAccess] = useState<boolean>(false); // Private by default
  const [isCheckingAccess, setIsCheckingAccess] = useState(true);
  const [enableAccessControl, setEnableAccessControl] = useState(false); // Enable via query param
  
  // Use the actual blockchain addresses from created invoices
  // In production, get from actual wallet
  const mockAddresses = {
    seller: "0x11deabd59b872d17c737b66f61d332230f341e774c6b5d3762f46a74536f947f", // Real sender address
    buyer: "0x19d4aaf4040b2577a1f1ca3b05ab3274eb2158c64d79361e40681c3877be8fed",
  };
  const currentUserAddress = mockAddresses[role];
  
  useEffect(() => {
    loadInvoice();
    // Check if access control is enabled via query param
    const params = new URLSearchParams(window.location.search);
    setEnableAccessControl(params.get('private') === 'true');
  }, [invoiceId]);
  
  useEffect(() => {
    // Always check access for buyer role, or if explicitly enabled
    if (invoice && currentUserAddress) {
      // Sellers always have access
      if (role === "seller") {
        setHasAccess(true);
        setIsCheckingAccess(false);
      } else {
        // Buyers need to check access
        checkAccess();
      }
    }
  }, [invoice, currentUserAddress, role]);
  
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
  
  const checkAccess = async () => {
    if (!invoice || !currentUserAddress) {
      setHasAccess(false);
      setIsCheckingAccess(false);
      return;
    }
    
    try {
      setIsCheckingAccess(true);
      const result = await checkInvoiceAccess(invoice.invoiceId, currentUserAddress);
      setHasAccess(result.hasAccess);
      
      // Log access if granted
      if (result.hasAccess) {
        try {
          await logInvoiceAccess(invoice.invoiceId, currentUserAddress, "view");
        } catch (logErr) {
          console.error("Failed to log access (non-critical):", logErr);
          // Don't fail if logging fails
        }
      }
    } catch (err) {
      console.error("Failed to check access:", err);
      // On error, deny access (fail closed for privacy)
      setHasAccess(false);
    } finally {
      setIsCheckingAccess(false);
    }
  };
  
  const handleAccessRequestSubmitted = () => {
    toast.info("Request Submitted", "Redirecting to dashboard...");
    setTimeout(() => router.push("/dashboard"), 2000);
  };
  
  const handlePayment = async () => {
    if (!invoice || !buyerAddress) {
      toast.error("Wallet Error", "Please connect your wallet as a buyer");
      return;
    }
    
    setShowProgress(true);
    setPaymentError(null);
    
    try {
      setPaymentStatus("checking-balance");
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const amount = BigInt(invoice.amount);
      
      setPaymentStatus("creating-authwit");
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPaymentStatus("submitting");
      await payInvoice({
        invoiceId: invoice.invoiceId,
        partialNoteHash: invoice.partialNoteHash,
        tokenAddress: invoice.tokenAddress,
        amount,
      });
      
      setPaymentStatus("confirming");
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      await markInvoicePaid(invoice.invoiceId);
      
      setPaymentStatus("success");
      toast.success("Payment Successful!", "Your invoice has been paid and verified on-chain");
      
      await loadInvoice();
      
      setTimeout(() => {
        setShowProgress(false);
        setPaymentStatus("idle");
      }, 5000);
    } catch (err) {
      console.error("Payment failed:", err);
      setPaymentStatus("error");
      const errorMessage = err instanceof Error ? err.message : "Unable to process payment. Please try again.";
      setPaymentError(errorMessage);
      toast.error("Payment Failed", errorMessage);
      
      setTimeout(() => {
        setShowProgress(false);
        setPaymentStatus("idle");
        setPaymentError(null);
      }, 8000);
    }
  };
  
  const handleDownloadPDF = () => {
    toast.info("Coming Soon", "PDF download feature will be available soon");
  };
  
  const handleShare = () => {
    if (invoice) {
      const url = `${window.location.origin}/invoice/${invoice.invoiceId}`;
      navigator.clipboard.writeText(url);
      toast.success("Link Copied!", "Invoice link has been copied to clipboard");
    }
  };
  
  if (isLoading || isCheckingAccess) {
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
              <Button onClick={() => router.push("/dashboard")} className="mt-4">
                Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  // Show access request dialog if user doesn't have permission (only if access control is enabled)
  if (enableAccessControl && hasAccess === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-primary/[0.02] to-purple-500/[0.03] relative overflow-hidden">
        <div className="absolute inset-0 bg-dots-pattern opacity-30"></div>
        <div className="container mx-auto py-8 px-4 max-w-4xl relative z-10">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/dashboard")}
            className="mb-4 hover:bg-accent"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <ComplianceRequestDialog
            invoiceId={invoice.invoiceId}
            requesterAddress={currentUserAddress}
            onRequestSubmitted={handleAccessRequestSubmitted}
          />
        </div>
      </div>
    );
  }
  
  const amount = typeof invoice.amount === "bigint" ? invoice.amount : BigInt(invoice.amount);
  
  let metadata;
  try {
    metadata = invoice.metadata ? JSON.parse(invoice.metadata) : null;
  } catch {
    metadata = null;
  }
  
  const canPay = role === "buyer" && invoice.status === "pending" && paymentStatus === "idle";
  // For POC, assume seller is the owner (in production, check address match)
  const isOwner = role === "seller";
  
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
          
          <h1 className="text-3xl lg:text-4xl font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text flex items-center gap-3">
            Transaction Details
          </h1>
        </div>

        {/* Main Card with User Info */}
        <Card className="mb-6 shadow-lg border-border/50 bg-card/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300 opacity-0 animate-fade-in-up animation-delay-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg relative">
                  <Image
                    src="/logo.png"
                    alt="Invoice"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">{invoice.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    Invoice #{truncateAddress(invoice.invoiceId, 12, 8)}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <div className="text-2xl font-bold">{formatUSDC(amount)}</div>
                <p className="text-sm text-muted-foreground">
                  {role === "seller" ? "You received" : "You sent"} USDC
                </p>
              </div>
            </div>

            <div className="flex gap-2 mt-6 pt-6 border-t">
              <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="flex-1">
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleShare} className="flex-1">
                <Share2 className="h-4 w-4 mr-2" />
                Share Invoice
              </Button>
              {invoice.status === "paid" && (
                <Button variant="outline" size="sm" className="flex-1">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  View on Explorer
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      
        {/* Tabs: Updates, Details, and Access Logs */}
        <Card className="shadow-lg border-border/50 bg-card/80 backdrop-blur-sm opacity-0 animate-fade-in-up animation-delay-400">
          <Tabs defaultValue="updates" className="w-full">
            <CardHeader className="border-b">
              <TabsList className={`grid w-full max-w-md ${isOwner ? 'grid-cols-3' : 'grid-cols-2'}`}>
                <TabsTrigger value="updates">Updates</TabsTrigger>
                <TabsTrigger value="details">Details</TabsTrigger>
                {isOwner && <TabsTrigger value="access">Access Log</TabsTrigger>}
              </TabsList>
            </CardHeader>

            {/* Updates Tab */}
            <TabsContent value="updates" className="p-6">
              {(showProgress || paymentStatus !== "idle" || invoice.status === "paid") ? (
                <TransactionProgress 
                  paymentStatus={invoice.status === "paid" ? "success" : paymentStatus}
                  createdAt={invoice.createdAt}
                  error={paymentError}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted mx-auto flex items-center justify-center mb-4">
                    <Loader2 className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">
                    {invoice.status === "pending" ? "Awaiting Payment" : "Invoice Created"}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    {invoice.status === "pending" 
                      ? "This invoice is waiting to be paid. Start the payment process to see live updates."
                      : "Invoice has been created and is ready for processing."
                    }
                  </p>
                  {canPay && (
                    <Button onClick={handlePayment} size="lg" className="shadow-lg">
                      Start Payment Process
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Details Tab */}
            <TabsContent value="details" className="p-6">
              <div className="space-y-6">
                {/* Private Information Section - Requires Access */}
                {!hasAccess && !isOwner ? (
                  <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center bg-muted/20">
                    <div className="max-w-md mx-auto space-y-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                        <Lock className="h-8 w-8 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold mb-2">Private Information</h3>
                        <p className="text-sm text-muted-foreground">
                          Sender and recipient details are private. Request access to view this information.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p><strong>Bill From:</strong> <span className="blur-sm select-none">John Business LLC</span></p>
                          <p><strong>Bill To:</strong> <span className="blur-sm select-none">Acme Corporation</span></p>
                        </div>
                      </div>
                      <Button onClick={async () => {
                        try {
                          setIsCheckingAccess(true);
                          // Trigger the access request dialog by setting access control and rechecking
                          setEnableAccessControl(true);
                          setHasAccess(false);
                          await checkAccess();
                        } finally {
                          setIsCheckingAccess(false);
                        }
                      }} size="lg" className="mt-4">
                        <Shield className="h-4 w-4 mr-2" />
                        Request Access to Private Details
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Bill From</h3>
                      <p className="text-sm font-mono bg-muted/50 rounded-lg p-3">{truncateAddress(invoice.senderAddress)}</p>
                      {metadata?.clientCompany && (
                        <p className="text-sm text-muted-foreground">{metadata.clientCompany}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Bill To</h3>
                      {metadata?.clientName && (
                        <p className="text-sm font-semibold">{metadata.clientName}</p>
                      )}
                      {metadata?.clientEmail && (
                        <p className="text-sm text-muted-foreground">{metadata.clientEmail}</p>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="border-t pt-6 grid md:grid-cols-3 gap-6">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Date of Issue</p>
                    <p className="font-medium">{formatDate(invoice.createdAt)}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <div>
                      <StatusBadge status={invoice.status} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Token</p>
                    <p className="font-medium">USDC</p>
                  </div>
                </div>

                {(hasAccess || isOwner) && metadata?.lineItems && metadata.lineItems.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-4">Line Items</h3>
                    <div className="space-y-3">
                      {metadata.lineItems.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-start p-3 rounded-lg bg-muted/30">
                          <div className="flex-1">
                            <p className="font-medium">{item.description}</p>
                            <p className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                            </p>
                          </div>
                          <p className="font-semibold">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(hasAccess || isOwner) && metadata?.memo && (
                  <div className="border-t pt-6">
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground bg-muted/30 rounded-lg p-4">
                      {metadata.memo}
                    </p>
                  </div>
                )}

                <div className="border-t pt-6">
                  <div className="flex justify-between items-center bg-primary/5 rounded-xl p-4">
                    <span className="text-lg font-semibold">Total Amount</span>
                    <span className="text-2xl font-bold text-primary">{formatUSDC(amount)}</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Access Log Tab (Owner Only) */}
            {isOwner && (
              <TabsContent value="access" className="p-6">
                <AccessLogViewer invoiceId={invoice.invoiceId} />
              </TabsContent>
            )}
          </Tabs>
        </Card>
      </div>
    </div>
  );
}

