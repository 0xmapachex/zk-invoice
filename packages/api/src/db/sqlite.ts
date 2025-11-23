import { Database } from "bun:sqlite";
import type { Invoice, AccessRequest, CreateAccessRequestInput, UpdateAccessRequestInput, AccessLog, CreateAccessLogInput } from "../types/api";
import type { IDatabase } from "./interface";
import { generateUUID } from "../utils/uuid";

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
    
    // Create access_requests table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS access_requests (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        requester_address TEXT NOT NULL,
        requester_name TEXT,
        requester_role TEXT,
        reason TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        requested_at INTEGER NOT NULL,
        responded_at INTEGER,
        response_reason TEXT,
        expires_at INTEGER,
        FOREIGN KEY (invoice_id) REFERENCES invoices(invoiceId)
      )
    `);
    
    // Create indexes for access_requests
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_access_requests_invoice ON access_requests(invoice_id)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_access_requests_requester ON access_requests(requester_address)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status)
    `);
    
    // Create access_logs table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS access_logs (
        id TEXT PRIMARY KEY,
        invoice_id TEXT NOT NULL,
        accessor_address TEXT NOT NULL,
        action TEXT NOT NULL,
        accessed_at INTEGER NOT NULL,
        FOREIGN KEY (invoice_id) REFERENCES invoices(invoiceId)
      )
    `);
    
    // Create indexes for access_logs
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_access_logs_invoice ON access_logs(invoice_id)
    `);
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_access_logs_accessor ON access_logs(accessor_address)
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

  // Access Request methods

  /**
   * Create a new access request
   */
  createAccessRequest(input: CreateAccessRequestInput): AccessRequest {
    const id = generateUUID();
    const requestedAt = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO access_requests (
        id, invoice_id, requester_address, requester_name, 
        requester_role, reason, status, requested_at
      )
      VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `);

    stmt.run(
      id,
      input.invoice_id,
      input.requester_address,
      input.requester_name || null,
      input.requester_role || null,
      input.reason,
      requestedAt
    );

    return {
      id,
      invoice_id: input.invoice_id,
      requester_address: input.requester_address,
      requester_name: input.requester_name,
      requester_role: input.requester_role,
      reason: input.reason,
      status: 'pending',
      requested_at: requestedAt,
    };
  }

  /**
   * Get access request by ID
   */
  getAccessRequestById(id: string): AccessRequest | null {
    const stmt = this.db.prepare("SELECT * FROM access_requests WHERE id = ?");
    const row = stmt.get(id) as any;
    
    if (!row) return null;
    
    return this.mapRowToAccessRequest(row);
  }

  /**
   * Get all access requests for an invoice
   */
  getAccessRequestsByInvoice(invoiceId: string): AccessRequest[] {
    const stmt = this.db.prepare(
      "SELECT * FROM access_requests WHERE invoice_id = ? ORDER BY requested_at DESC"
    );
    const rows = stmt.all(invoiceId) as any[];
    
    return rows.map(row => this.mapRowToAccessRequest(row));
  }

  /**
   * Get access requests by requester address
   */
  getAccessRequestsByRequester(requesterAddress: string): AccessRequest[] {
    const stmt = this.db.prepare(
      "SELECT * FROM access_requests WHERE requester_address = ? ORDER BY requested_at DESC"
    );
    const rows = stmt.all(requesterAddress) as any[];
    
    return rows.map(row => this.mapRowToAccessRequest(row));
  }

  /**
   * Get pending access requests for invoice owner
   */
  getPendingAccessRequestsByOwner(ownerAddress: string): AccessRequest[] {
    const stmt = this.db.prepare(`
      SELECT ar.* FROM access_requests ar
      JOIN invoices i ON ar.invoice_id = i.invoiceId
      WHERE i.senderAddress = ? AND ar.status = 'pending'
      ORDER BY ar.requested_at DESC
    `);
    const rows = stmt.all(ownerAddress) as any[];
    
    return rows.map(row => this.mapRowToAccessRequest(row));
  }

  /**
   * Update access request status (approve/deny)
   */
  updateAccessRequest(id: string, update: UpdateAccessRequestInput): boolean {
    const respondedAt = Date.now();
    
    const stmt = this.db.prepare(`
      UPDATE access_requests 
      SET status = ?, responded_at = ?, response_reason = ?, expires_at = ?
      WHERE id = ?
    `);
    
    const result = stmt.run(
      update.status,
      respondedAt,
      update.response_reason || null,
      update.expires_at || null,
      id
    );
    
    return result.changes > 0;
  }

  /**
   * Check if user has valid access to invoice
   */
  hasValidAccess(invoiceId: string, userAddress: string): boolean {
    const stmt = this.db.prepare(`
      SELECT * FROM access_requests 
      WHERE invoice_id = ? 
        AND requester_address = ? 
        AND status = 'approved'
        AND (expires_at IS NULL OR expires_at > ?)
    `);
    
    const now = Date.now();
    const row = stmt.get(invoiceId, userAddress, now) as any;
    
    return !!row;
  }

  // Access Log methods

  /**
   * Create a new access log entry
   */
  createAccessLog(input: CreateAccessLogInput): AccessLog {
    const id = generateUUID();
    const accessedAt = Date.now();
    
    const stmt = this.db.prepare(`
      INSERT INTO access_logs (
        id, invoice_id, accessor_address, action, accessed_at
      )
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      input.invoice_id,
      input.accessor_address,
      input.action,
      accessedAt
    );

    return {
      id,
      invoice_id: input.invoice_id,
      accessor_address: input.accessor_address,
      action: input.action,
      accessed_at: accessedAt,
    };
  }

  /**
   * Get all access logs for an invoice
   */
  getAccessLogsByInvoice(invoiceId: string): AccessLog[] {
    const stmt = this.db.prepare(
      "SELECT * FROM access_logs WHERE invoice_id = ? ORDER BY accessed_at DESC"
    );
    const rows = stmt.all(invoiceId) as any[];
    
    return rows.map(row => this.mapRowToAccessLog(row));
  }

  /**
   * Get access logs by accessor address
   */
  getAccessLogsByAccessor(accessorAddress: string): AccessLog[] {
    const stmt = this.db.prepare(
      "SELECT * FROM access_logs WHERE accessor_address = ? ORDER BY accessed_at DESC"
    );
    const rows = stmt.all(accessorAddress) as any[];
    
    return rows.map(row => this.mapRowToAccessLog(row));
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

  /**
   * Helper method to map database row to AccessRequest object
   */
  private mapRowToAccessRequest(row: any): AccessRequest {
    return {
      id: row.id,
      invoice_id: row.invoice_id,
      requester_address: row.requester_address,
      requester_name: row.requester_name,
      requester_role: row.requester_role,
      reason: row.reason,
      status: row.status as 'pending' | 'approved' | 'denied',
      requested_at: row.requested_at,
      responded_at: row.responded_at,
      response_reason: row.response_reason,
      expires_at: row.expires_at,
    };
  }

  /**
   * Helper method to map database row to AccessLog object
   */
  private mapRowToAccessLog(row: any): AccessLog {
    return {
      id: row.id,
      invoice_id: row.invoice_id,
      accessor_address: row.accessor_address,
      action: row.action as 'view' | 'download' | 'export',
      accessed_at: row.accessed_at,
    };
  }
}
