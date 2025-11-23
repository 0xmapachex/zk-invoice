import type {
  Invoice,
  CreateInvoiceRequest,
  ApiResponse,
  InvoiceResponse,
} from "@/types/invoice";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

/**
 * Fetch all invoices or filter by criteria
 */
export async function getInvoices(filters?: {
  status?: string;
  sender?: string;
  tokenAddress?: string;
}): Promise<Invoice[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append("status", filters.status);
  if (filters?.sender) params.append("sender_address", filters.sender);
  if (filters?.tokenAddress)
    params.append("token_address", filters.tokenAddress);

  const url = `${API_URL}/invoice${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch invoices: ${response.statusText}`);
  }

  const result: ApiResponse<Invoice[]> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to fetch invoices");
  }

  return result.data;
}

/**
 * Fetch a single invoice by ID
 */
export async function getInvoiceById(id: string): Promise<Invoice> {
  const response = await fetch(`${API_URL}/invoice?id=${id}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch invoice: ${response.statusText}`);
  }

  const result: ApiResponse<Invoice[]> = await response.json();

  if (!result.success || !result.data || result.data.length === 0) {
    throw new Error(result.error || `Invoice ${id} not found`);
  }

  return result.data[0];
}

/**
 * Create a new invoice in the API
 */
export async function createInvoiceInAPI(
  invoice: CreateInvoiceRequest
): Promise<InvoiceResponse> {
  const response = await fetch(`${API_URL}/invoice`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...invoice,
      amount:
        typeof invoice.amount === "bigint"
          ? invoice.amount.toString()
          : invoice.amount,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to create invoice: ${response.statusText}`);
  }

  const result: InvoiceResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to create invoice");
  }

  return result;
}

/**
 * Mark an invoice as paid
 */
export async function markInvoicePaid(invoiceId: string): Promise<void> {
  const response = await fetch(`${API_URL}/invoice/paid`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ invoiceId }),
  });

  if (!response.ok) {
    throw new Error(`Failed to mark invoice as paid: ${response.statusText}`);
  }

  const result: ApiResponse = await response.json();

  if (!result.success) {
    throw new Error(result.error || "Failed to mark invoice as paid");
  }
}

/**
 * Update an invoice (e.g., partial note hash)
 */
export async function updateInvoice(
  invoiceId: string,
  updates: Partial<CreateInvoiceRequest>
): Promise<Invoice> {
  const response = await fetch(`${API_URL}/invoice/${invoiceId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    throw new Error(`Failed to update invoice: ${response.statusText}`);
  }

  const result: ApiResponse<Invoice> = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to update invoice");
  }

  return result.data;
}
