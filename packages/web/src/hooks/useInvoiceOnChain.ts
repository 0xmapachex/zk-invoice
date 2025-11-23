// Hook for on-chain invoice operations
// Integrates the blockchain logic with React

import { useState } from "react";
import { createInvoiceOnChain, payInvoiceOnChain } from "@/lib/aztec/transactions";
import { useWalletStore } from "@/stores/useWalletStore";
import deploymentsData from "@/lib/data/deployments.json";

export function useInvoiceOnChain() {
  const { currentAddress, role, sellerAddress, buyerAddress } = useWalletStore();
  const [isCreating, setIsCreating] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Create an invoice on-chain and register in API
   */
  const createInvoice = async (params: {
    title: string;
    amount: bigint;
    metadata: string;
  }) => {
    if (!currentAddress || !sellerAddress) {
      throw new Error("Wallet not connected");
    }

    if (role !== "seller") {
      throw new Error("Only sellers can create invoices");
    }

    setIsCreating(true);
    setError(null);

    try {
      const tokenAddress = deploymentsData.usdc?.address || "0x0000000000000000000000000000000000000000";
      
      const result = await createInvoiceOnChain({
        wallet: null, // TODO: Initialize wallet when Aztec SDK is added
        senderAddress: sellerAddress,
        registry: null, // TODO: Initialize registry when Aztec SDK is added
        node: null, // TODO: Initialize node when Aztec SDK is added
        title: params.title,
        amount: params.amount,
        tokenAddress,
        metadata: params.metadata,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to create invoice";
      setError(errorMessage);
      throw err;
    } finally {
      setIsCreating(false);
    }
  };

  /**
   * Pay an invoice on-chain and mark as paid in API
   */
  const payInvoice = async (params: {
    invoiceId: string;
    partialNoteHash: string;
    tokenAddress: string;
    amount: bigint;
  }) => {
    if (!currentAddress || !buyerAddress) {
      throw new Error("Wallet not connected");
    }

    if (role !== "buyer") {
      throw new Error("Only buyers can pay invoices");
    }

    setIsPaying(true);
    setError(null);

    try {
      const result = await payInvoiceOnChain({
        wallet: null, // TODO: Initialize wallet when Aztec SDK is added
        payerAddress: buyerAddress,
        registry: null, // TODO: Initialize registry when Aztec SDK is added
        token: null, // TODO: Initialize token when Aztec SDK is added
        invoiceId: params.invoiceId,
        partialNote: params.partialNoteHash,
        tokenAddress: params.tokenAddress,
        amount: params.amount,
      });

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to pay invoice";
      setError(errorMessage);
      throw err;
    } finally {
      setIsPaying(false);
    }
  };

  return {
    createInvoice,
    payInvoice,
    isCreating,
    isPaying,
    error,
  };
}

