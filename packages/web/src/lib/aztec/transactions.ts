/**
 * Aztec Transaction Operations
 * 
 * Calls the API's blockchain endpoints to execute transactions server-side.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface CreateInvoiceParams {
  wallet: any;
  senderAddress: string;
  registry: any;
  node: any;
  title: string;
  amount: bigint;
  tokenAddress: string;
  metadata: string;
}

interface PayInvoiceParams {
  wallet: any;
  payerAddress: string;
  registry: any;
  token: any;
  invoiceId: string;
  partialNote: string;
  tokenAddress: string;
  amount: bigint;
}

interface InvoiceResult {
  invoiceId: string;
  partialNoteHash: string;
  txHash?: string;
  registryAddress?: string;
}

/**
 * Create an invoice on-chain via API
 */
export const createInvoiceOnChain = async (
  params: CreateInvoiceParams
): Promise<InvoiceResult> => {
  console.log("Creating invoice on-chain via API...");
  console.log("Invoice params:", {
    title: params.title,
    amount: params.amount.toString(),
    tokenAddress: params.tokenAddress,
  });

  try {
    const response = await fetch(`${API_URL}/blockchain/invoice/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: params.title,
        amount: params.amount.toString(),
        tokenAddress: params.tokenAddress,
        metadata: params.metadata,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to create invoice: ${response.statusText}`
      );
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || "Failed to create invoice");
    }

    console.log("Invoice created successfully:", result.data);

    return {
      invoiceId: result.data.invoiceId,
      partialNoteHash: result.data.partialNoteHash,
      txHash: result.data.txHash,
      registryAddress: result.data.registryAddress,
    };
  } catch (error) {
    console.error("Error creating invoice on-chain:", error);
    throw error;
  }
};

/**
 * Pay an invoice on-chain via API
 */
export const payInvoiceOnChain = async (
  params: PayInvoiceParams
): Promise<{ txHash: string }> => {
  console.log("Paying invoice on-chain via API...");
  console.log("Payment params:", {
    invoiceId: params.invoiceId,
    amount: params.amount.toString(),
  });

  try {
    const response = await fetch(`${API_URL}/blockchain/invoice/pay`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        invoiceId: params.invoiceId,
        partialNoteHash: params.partialNote,
        tokenAddress: params.tokenAddress,
        amount: params.amount.toString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `Failed to pay invoice: ${response.statusText}`
      );
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Failed to pay invoice");
    }

    console.log("Invoice paid successfully:", result.data);

    return {
      txHash: result.data.txHash,
    };
  } catch (error) {
    console.error("Error paying invoice on-chain:", error);
    throw error;
  }
};


