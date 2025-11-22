/**
 * Invoice Type
 * 
 * TODO Phase 2: Add client-side encryption
 * - Replace plaintext senderAddress with encryptedPayload
 * - Replace plaintext metadata with encrypted field
 * - Add commitment: Field (hash of encrypted payload)
 * - Add zkProof: Proof (proves correctness without decrypting)
 * - Add WebAuthn signature for authentication
 */
export interface Invoice {
  invoiceId: string;
  registryAddress: string;     // Single contract for all invoices
  senderAddress: string;       // TODO Phase 2: Encrypt this field
  partialNoteHash: string;     // For payer to complete
  title: string;               // Public: what payer sees
  tokenAddress: string;        // Public: which token
  amount: BigInt;              // Public: how much
  status: 'pending' | 'paid';  // Payment status
  metadata?: string;           // TODO Phase 2: Encrypt this field
  createdAt: number;           // Timestamp
}

/**
 * Invoice Creation Type (invoiceId is generated server-side)
 * 
 * TODO Phase 2: Transform to encrypted creation
 * - Receive encryptedPayload instead of plaintext senderAddress
 * - Receive zkProof proving invoice validity
 * - Validate proof before storing
 */
export interface CreateInvoiceRequest {
  senderAddress: string;       // TODO Phase 2: Should be encrypted
  title: string;
  tokenAddress: string;
  amount: BigInt;
  metadata?: string;           // TODO Phase 2: Should be encrypted
}

/**
 * Serialized Invoice Type (for API responses)
 */
export interface SerializedInvoice {
  invoiceId: string;
  registryAddress: string;
  senderAddress: string;       // TODO Phase 2: Will be encryptedPayload
  partialNoteHash: string;
  title: string;
  tokenAddress: string;
  amount: string;              // BigInt serialized to string
  status: 'pending' | 'paid';
  metadata?: string;           // TODO Phase 2: Will be encrypted
  createdAt: number;
}

/**
 * API Response Types
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

export interface InvoiceResponse extends ApiResponse {
  invoiceId?: string;
  shareableUrl?: string;  // Added for easy sharing
}

export type RequestHandler = (req: Request) => Promise<Response>;

// TODO Phase 2: Add encryption-related types
// export interface EncryptedInvoicePayload {
//   encryptedData: string;     // Encrypted senderAddress + metadata
//   commitment: string;        // Hash of encrypted payload
//   zkProof: string;          // Proof of invoice validity
//   webAuthnSignature: string; // Authentication signature
// }
