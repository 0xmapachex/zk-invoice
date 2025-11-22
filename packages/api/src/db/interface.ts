import type { Invoice } from "../types/api";

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
}
