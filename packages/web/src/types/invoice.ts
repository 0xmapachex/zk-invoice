// Invoice types - matching the API package structure

export interface Invoice {
  invoiceId: string;
  registryAddress: string;
  senderAddress: string;
  partialNoteHash: string;
  title: string;
  tokenAddress: string;
  amount: string | bigint; // BigInt serialized to string in API
  status: 'pending' | 'paid';
  metadata?: string;
  createdAt: number;
}

export interface CreateInvoiceRequest {
  invoiceId?: string;
  registryAddress?: string;
  senderAddress: string;
  partialNoteHash?: string;
  title: string;
  tokenAddress: string;
  amount: string | bigint;
  metadata?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface InvoiceResponse extends ApiResponse {
  invoiceId?: string;
  shareableUrl?: string;
  data?: Invoice;
}

// Frontend-specific types

export interface LineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface InvoiceFormData {
  clientName: string;
  clientCompany?: string;
  clientEmail?: string;
  clientAddress?: string;
  clientCity?: string;
  clientState?: string;
  clientZip?: string;
  dateOfIssue: Date;
  dueDate: Date;
  memo?: string;
  lineItems: LineItem[];
  tokenAddress: string;
  total: number;
}

export interface InvoiceFilters {
  status?: 'all' | 'pending' | 'paid' | 'overdue' | 'draft';
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

export interface InvoiceStats {
  totalEarnings: bigint;
  totalInvoices: number;
  paidAmount: bigint;
  unpaidAmount: bigint;
}

export type PaymentStatus = 'idle' | 'checking-balance' | 'creating-authwit' | 'submitting' | 'confirming' | 'success' | 'error';

export interface PaymentState {
  status: PaymentStatus;
  error?: string;
  txHash?: string;
}

