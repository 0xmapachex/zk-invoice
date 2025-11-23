import type { Invoice, AccessRequest, CreateAccessRequestInput, UpdateAccessRequestInput, AccessLog, CreateAccessLogInput } from "../types/api";

/**
 * Database interface for invoice operations
 * This interface can be implemented by different database providers (SQLite, PostgreSQL, etc.)
 */
export interface IDatabase {
  /**
   * Initialize the database schema
   */
  initialize(): void;

  /**
   * Insert a new invoice into the database
   */
  insertInvoice(invoice: Invoice): Invoice;

  /**
   * Get invoice by ID
   */
  getInvoiceById(invoiceId: string): Invoice | null;

  /**
   * Get all invoices
   */
  getAllInvoices(): Invoice[];

  /**
   * Update an invoice
   * @param invoiceId - the invoice ID to update
   * @param invoice - the updated invoice data
   */
  updateInvoice(invoiceId: string, invoice: Invoice): boolean;

  /**
   * Mark an invoice as paid
   * @param invoiceId - the invoice ID to mark as paid
   */
  markInvoicePaid(invoiceId: string): boolean;

  /**
   * Get invoices by token address
   */
  getInvoicesByToken(tokenAddress: string): Invoice[];

  /**
   * Get invoices by status
   */
  getInvoicesByStatus(status: 'pending' | 'paid'): Invoice[];

  /**
   * Get invoices with flexible filtering
   */
  getInvoicesWithFilters(filters: {
    tokenAddress?: string;
    status?: 'pending' | 'paid';
    senderAddress?: string;
  }): Invoice[];

  /**
   * Close database connection (if applicable)
   */
  close(): void;

  // Access Request methods
  
  /**
   * Create a new access request
   */
  createAccessRequest(input: CreateAccessRequestInput): AccessRequest;

  /**
   * Get access request by ID
   */
  getAccessRequestById(id: string): AccessRequest | null;

  /**
   * Get all access requests for an invoice
   */
  getAccessRequestsByInvoice(invoiceId: string): AccessRequest[];

  /**
   * Get access requests by requester address
   */
  getAccessRequestsByRequester(requesterAddress: string): AccessRequest[];

  /**
   * Get pending access requests for invoice owner
   */
  getPendingAccessRequestsByOwner(ownerAddress: string): AccessRequest[];

  /**
   * Update access request status (approve/deny)
   */
  updateAccessRequest(id: string, update: UpdateAccessRequestInput): boolean;

  /**
   * Check if user has valid access to invoice
   */
  hasValidAccess(invoiceId: string, userAddress: string): boolean;

  // Access Log methods

  /**
   * Create a new access log entry
   */
  createAccessLog(input: CreateAccessLogInput): AccessLog;

  /**
   * Get all access logs for an invoice
   */
  getAccessLogsByInvoice(invoiceId: string): AccessLog[];

  /**
   * Get access logs by accessor address
   */
  getAccessLogsByAccessor(accessorAddress: string): AccessLog[];
}
