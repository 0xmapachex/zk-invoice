"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { useWalletStore } from "@/stores/useWalletStore";
import { useInvoiceOnChain } from "@/hooks/useInvoiceOnChain";
import { useToast } from "@/hooks/useToast";
import type { LineItem } from "@/types/invoice";
import deploymentsData from "@/lib/data/deployments.json";

// Form validation schema
const lineItemSchema = z.object({
  description: z.string().min(1, "Description is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
});

const invoiceFormSchema = z.object({
  clientName: z.string().min(1, "Client name is required"),
  clientCompany: z.string().optional(),
  clientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
  title: z.string().min(1, "Invoice title is required"),
  memo: z.string().optional(),
  lineItems: z.array(lineItemSchema).min(1, "At least one item is required"),
});

type InvoiceFormData = z.infer<typeof invoiceFormSchema>;

export default function CreateInvoicePage() {
  const router = useRouter();
  const { currentAddress, sellerAddress, isConnected, connect } = useWalletStore();
  const { createInvoice, isCreating } = useInvoiceOnChain();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Auto-connect wallet on mount
  useEffect(() => {
    if (!isConnected) {
      connect().catch((error) => {
        console.error("Wallet connection error:", error);
        toast.error("Connection Failed", "Unable to connect wallet. Please try again.");
      });
    }
  }, [isConnected]);
  
  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<InvoiceFormData>({
    resolver: zodResolver(invoiceFormSchema),
    defaultValues: {
      clientName: "",
      clientCompany: "",
      clientEmail: "",
      title: "Payment for Services",
      memo: "",
      lineItems: [{ description: "", quantity: 1, unitPrice: 100 }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control,
    name: "lineItems",
  });
  
  const lineItems = watch("lineItems");
  
  // Calculate totals
  const subtotal = lineItems.reduce((sum, item) => {
    return sum + (item.quantity || 0) * (item.unitPrice || 0);
  }, 0);
  
  const onSubmit = async (data: InvoiceFormData) => {
    if (!currentAddress || !sellerAddress) {
      toast.error("Wallet Not Connected", "Please connect your wallet first");
      return;
    }
    
    // Validate total amount
    if (subtotal <= 0) {
      toast.error("Invalid Amount", "Invoice total must be greater than $0. Please add items with valid prices.");
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Get token address from deployments
      const tokenAddress = deploymentsData.usdc?.address || "0x0000000000000000000000000000000000000000";
      
      // Prepare metadata
      const metadata = JSON.stringify({
        clientName: data.clientName,
        clientCompany: data.clientCompany,
        clientEmail: data.clientEmail,
        memo: data.memo,
        lineItems: data.lineItems,
      });
      
      // Convert amount to smallest unit (assuming 6 decimals for USDC-like tokens)
      // subtotal is in dollars, convert to token units
      const amount = BigInt(Math.floor(subtotal * 1_000_000)); // 6 decimals
      
      console.log("Creating invoice on-chain:", {
        title: data.title,
        amount: amount.toString(),
        tokenAddress,
        senderAddress: sellerAddress,
        metadata: JSON.parse(metadata),
      });
      
      // Create invoice on-chain and register in API
      const result = await createInvoice({
        title: data.title,
        amount,
        metadata,
      });
      
      toast.success("Invoice Created!", "Your invoice has been created successfully on-chain");
      
      // Navigate to the invoice detail page
      if (result.invoiceId) {
        setTimeout(() => {
          router.push(`/invoice/${result.invoiceId}`);
        }, 1000);
      } else {
        // Navigate to dashboard if no specific invoice ID
        setTimeout(() => {
          router.push('/');
        }, 1000);
      }
    } catch (error) {
      console.error("Failed to create invoice:", error);
      toast.error(
        "Creation Failed", 
        error instanceof Error ? error.message : "Failed to create invoice. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Create New Invoice</h1>
        <p className="text-muted-foreground mt-1">
          Fill in the details to create a new invoice
        </p>
      </div>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Bill From (Auto-filled) */}
        <Card>
          <CardHeader>
            <CardTitle>Bill From</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label>Sender Address</Label>
                <Input
                  value={currentAddress || "Not connected"}
                  disabled
                  className="font-mono text-sm"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Bill To */}
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="clientName">Client Name *</Label>
              <Input
                id="clientName"
                {...register("clientName")}
                placeholder="John Doe"
              />
              {errors.clientName && (
                <p className="text-sm text-destructive mt-1">{errors.clientName.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="clientCompany">Company (Optional)</Label>
              <Input
                id="clientCompany"
                {...register("clientCompany")}
                placeholder="Acme Inc."
              />
            </div>
            
            <div>
              <Label htmlFor="clientEmail">Email (Optional)</Label>
              <Input
                id="clientEmail"
                type="email"
                {...register("clientEmail")}
                placeholder="john@example.com"
              />
              {errors.clientEmail && (
                <p className="text-sm text-destructive mt-1">{errors.clientEmail.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
        
        {/* Invoice Details */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="title">Invoice Title *</Label>
              <Input
                id="title"
                {...register("title")}
                placeholder="Payment for Services"
              />
              {errors.title && (
                <p className="text-sm text-destructive mt-1">{errors.title.message}</p>
              )}
            </div>
            
            <div>
              <Label htmlFor="memo">Memo / Notes (Optional)</Label>
              <textarea
                id="memo"
                {...register("memo")}
                placeholder="Additional notes..."
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
            </div>
          </CardContent>
        </Card>
        
        {/* Line Items */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle>Line Items</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ description: "", quantity: 1, unitPrice: 100 })}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Item
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="flex gap-4 items-start">
                  <div className="flex-1">
                    <Label htmlFor={`lineItems.${index}.description`}>Description</Label>
                    <Input
                      id={`lineItems.${index}.description`}
                      {...register(`lineItems.${index}.description`)}
                      placeholder="Service or item description"
                    />
                    {errors.lineItems?.[index]?.description && (
                      <p className="text-sm text-destructive mt-1">
                        {errors.lineItems[index]?.description?.message}
                      </p>
                    )}
                  </div>
                  
                  <div className="w-24">
                    <Label htmlFor={`lineItems.${index}.quantity`}>Qty</Label>
                    <Input
                      id={`lineItems.${index}.quantity`}
                      type="number"
                      {...register(`lineItems.${index}.quantity`, { valueAsNumber: true })}
                      min="1"
                    />
                  </div>
                  
                  <div className="w-32">
                    <Label htmlFor={`lineItems.${index}.unitPrice`}>Unit Price</Label>
                    <Input
                      id={`lineItems.${index}.unitPrice`}
                      type="number"
                      step="0.01"
                      {...register(`lineItems.${index}.unitPrice`, { valueAsNumber: true })}
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                  
                  <div className="w-32">
                    <Label>Amount</Label>
                    <div className="h-10 flex items-center font-semibold">
                      ${((lineItems[index]?.quantity || 0) * (lineItems[index]?.unitPrice || 0)).toFixed(2)}
                    </div>
                  </div>
                  
                  {fields.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => remove(index)}
                      className="mt-7"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              {errors.lineItems && typeof errors.lineItems.message === "string" && (
                <p className="text-sm text-destructive">{errors.lineItems.message}</p>
              )}
              
              {/* Totals */}
              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total:</span>
                  <span>${subtotal.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Actions */}
        <div className="flex justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/")}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Invoice"
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

