import { Database } from "bun:sqlite";
import type { Invoice } from "../types/api";
import type { IDatabase } from "./interface";

/**
 * SQLite implementation of the Database interface for invoices
 */
export class SQLiteDatabase implements IDatabase {
  private db: Database;

  constructor(filename: string = "invoices.sqlite") {
    try {
      this.db = new Database(filename);
    } catch (error) {
      throw new Error(
        `Failed to create database connection: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Initialize database schema
   */
  initialize(): void {
    // Create invoices table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS invoices (
        invoiceId TEXT PRIMARY KEY,
        registryAddress TEXT NOT NULL,
        senderAddress TEXT NOT NULL,
        partialNoteHash TEXT NOT NULL,
        title TEXT NOT NULL,
        tokenAddress TEXT NOT NULL,
        amount TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        metadata TEXT,
        createdAt INTEGER NOT NULL
      )
    `);
    
    // Create index on invoiceId for faster lookups
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_invoices_id ON invoices(invoiceId)
    `);
    
    // Create index on status for filtering
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status)
    `);
    
    // Create index on tokenAddress for filtering
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_invoices_token ON invoices(tokenAddress)
    `);
  }

  /**
   * Insert a new invoice into the database
   */
  insertInvoice(invoice: Invoice): Invoice {
    const stmt = this.db.prepare(`
      INSERT INTO invoices (
        invoiceId, registryAddress, senderAddress, partialNoteHash, 
        title, tokenAddress, amount, status, metadata, createdAt
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      stmt.run(
        invoice.invoiceId,
        invoice.registryAddress,
        invoice.senderAddress,
        invoice.partialNoteHash,
        invoice.title,
        invoice.tokenAddress,
        invoice.amount.toString(), // Convert BigInt to string for storage
        invoice.status,
        invoice.metadata || null,
        invoice.createdAt
      );

      return invoice;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("UNIQUE constraint failed")
      ) {
        throw new Error(
          `Invoice with ID ${invoice.invoiceId} already exists`,
        );
      }
      throw error;
    }
  }

  /**
   * Get invoice by ID
   */
  getInvoiceById(invoiceId: string): Invoice | null {
    const stmt = this.db.prepare("SELECT * FROM invoices WHERE invoiceId = ?");
    const row = stmt.get(invoiceId) as any;

    if (!row) return null;

    return this.mapRowToInvoice(row);
  }

  /**
   * Get all invoices
   */
  getAllInvoices(): Invoice[] {
    const stmt = this.db.prepare(
      "SELECT * FROM invoices ORDER BY createdAt DESC",
    );
    const rows = stmt.all() as any[];

    return rows.map((row) => this.mapRowToInvoice(row));
  }

  /**
   * Update an invoice
   */
  updateInvoice(invoiceId: string, invoice: Invoice): boolean {
    const stmt = this.db.prepare(`
      UPDATE invoices 
      SET registryAddress = ?,
          senderAddress = ?,
          partialNoteHash = ?,
          title = ?,
          tokenAddress = ?,
          amount = ?,
          status = ?,
          metadata = ?
      WHERE invoiceId = ?
    `);
    
    try {
      const result = stmt.run(
        invoice.registryAddress,
        invoice.senderAddress,
        invoice.partialNoteHash,
        invoice.title,
        invoice.tokenAddress,
        invoice.amount.toString(),
        invoice.status,
        invoice.metadata || null,
        invoiceId
      );
      return result.changes > 0;
    } catch (error) {
      console.error(`Error updating invoice ${invoiceId}:`, error);
      return false;
    }
  }

  /**
   * Mark an invoice as paid
   */
  markInvoicePaid(invoiceId: string): boolean {
    const stmt = this.db.prepare(
      "UPDATE invoices SET status = 'paid' WHERE invoiceId = ?"
    );
    const result = stmt.run(invoiceId);
    return result.changes > 0;
  }

  /**
   * Get invoices by token address
   */
  getInvoicesByToken(tokenAddress: string): Invoice[] {
    const stmt = this.db.prepare(
      "SELECT * FROM invoices WHERE tokenAddress = ? ORDER BY createdAt DESC",
    );
    const rows = stmt.all(tokenAddress) as any[];

    return rows.map((row) => this.mapRowToInvoice(row));
  }

  /**
   * Get invoices by status
   */
  getInvoicesByStatus(status: 'pending' | 'paid'): Invoice[] {
    const stmt = this.db.prepare(
      "SELECT * FROM invoices WHERE status = ? ORDER BY createdAt DESC",
    );
    const rows = stmt.all(status) as any[];

    return rows.map((row) => this.mapRowToInvoice(row));
  }

  /**
   * Get invoices with flexible filtering
   */
  getInvoicesWithFilters(filters: {
    tokenAddress?: string;
    status?: 'pending' | 'paid';
    senderAddress?: string;
  }): Invoice[] {
    let query = "SELECT * FROM invoices WHERE 1=1";
    const params: string[] = [];

    if (filters.tokenAddress) {
      query += " AND tokenAddress = ?";
      params.push(filters.tokenAddress);
    }

    if (filters.status) {
      query += " AND status = ?";
      params.push(filters.status);
    }

    if (filters.senderAddress) {
      query += " AND senderAddress = ?";
      params.push(filters.senderAddress);
    }

    query += " ORDER BY createdAt DESC";

    const stmt = this.db.prepare(query);
    const rows = stmt.all(...params) as any[];

    return rows.map((row) => this.mapRowToInvoice(row));
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }

  /**
   * Helper method to map database row to Invoice object
   */
  private mapRowToInvoice(row: any): Invoice {
    return {
      invoiceId: row.invoiceId,
      registryAddress: row.registryAddress,
      senderAddress: row.senderAddress,
      partialNoteHash: row.partialNoteHash,
      title: row.title,
      tokenAddress: row.tokenAddress,
      amount: BigInt(row.amount), // Convert string back to BigInt
      status: row.status as 'pending' | 'paid',
      metadata: row.metadata,
      createdAt: row.createdAt,
    };
  }
}
