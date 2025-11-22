import type { RequestHandler, ApiResponse, InvoiceResponse, Invoice, CreateInvoiceRequest } from "../types/api";
import type { IDatabase } from "../db";
import { generateOrderId } from "../utils/uuid";
import { stringifyWithBigInt, serializeInvoice, serializeInvoices } from "../utils/serialization";

// TODO Phase 2: Add encryption layer
// 1. Client sends: encryptedPayload + public fields (title, amount, token) + zkProof
// 2. Validate zkProof proves correctness without decrypting
//    - Verify proof shows: hash(title) = titleHash, hash(amount) = amountHash, etc.
//    - Verify commitment = hash(encryptedPayload)
// 3. Store encryptedPayload, never store plaintext senderAddress/metadata
// 4. Add WebAuthn signature validation for authentication

/**
 * Create invoice handlers with database dependency injection
 */
export function createInvoiceHandlers(database: IDatabase) {
  /**
   * Handle POST /invoice - Create a new invoice
   */
  const handleCreateInvoice: RequestHandler = async (req: Request): Promise<Response> => {
    try {
      // Parse the request body
      const rawData = await req.json();

      // Convert string amounts to BigInt
      const createInvoiceData: CreateInvoiceRequest = {
        senderAddress: rawData.senderAddress,       // TODO Phase 2: Should be encryptedPayload
        title: rawData.title,
        tokenAddress: rawData.tokenAddress,
        amount: BigInt(rawData.amount),
        metadata: rawData.metadata || undefined
      };

      // Use invoice ID from request (blockchain ID) or generate UUID as fallback
      const invoiceId = rawData.invoiceId || generateOrderId();
      
      // Get registry address from request or env
      const registryAddress = rawData.registryAddress || process.env.REGISTRY_ADDRESS || "0x0";

      // Create the complete invoice object
      const invoice: Invoice = {
        invoiceId,
        registryAddress,
        senderAddress: createInvoiceData.senderAddress,
        partialNoteHash: "0x0",  // Will be set by contract, placeholder for now
        title: createInvoiceData.title,
        tokenAddress: createInvoiceData.tokenAddress,
        amount: createInvoiceData.amount,
        status: 'pending',
        metadata: createInvoiceData.metadata,
        createdAt: Date.now()
      };

      // Save to database
      const savedInvoice = database.insertInvoice(invoice);

      const response: InvoiceResponse = {
        success: true,
        message: "Invoice created successfully",
        invoiceId: savedInvoice.invoiceId,
        shareableUrl: `/invoice/${savedInvoice.invoiceId}`,
        data: serializeInvoice(savedInvoice)
      };
      
      console.log(`Created invoice #${invoiceId} (sender: ${invoice.senderAddress.substring(0, 10)}...)`);
      
      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error creating invoice:", error);

      const errorMessage = error instanceof Error ? error.message : "Failed to create invoice";

      const response: ApiResponse = {
        success: false,
        error: errorMessage
      };
      
      return new Response(
        JSON.stringify(response),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  };

  /**
   * Handle GET /invoice - Retrieve invoice(s)
   */
  const handleGetInvoice: RequestHandler = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const invoiceId = url.searchParams.get("id");
      const tokenAddress = url.searchParams.get("token_address");
      const status = url.searchParams.get("status") as 'pending' | 'paid' | null;
      const senderAddress = url.searchParams.get("sender_address");

      let invoices: Invoice[];
      let message: string;

      // If invoiceId is provided, get specific invoice
      if (invoiceId) {
        const invoice = database.getInvoiceById(invoiceId);

        if (!invoice) {
          const response: ApiResponse<any[]> = {
            success: false,
            error: `Invoice with ID ${invoiceId} not found`,
            data: []
          };

          return new Response(
            JSON.stringify(response),
            {
              status: 404,
              headers: { "Content-Type": "application/json" }
            }
          );
        }

        invoices = [invoice];
        message = "Invoice retrieved successfully";
      } else if (tokenAddress || status || senderAddress) {
        // If any filter parameters are provided, use filtered query
        const filters: any = {};
        if (tokenAddress) filters.tokenAddress = tokenAddress;
        if (status) filters.status = status;
        if (senderAddress) filters.senderAddress = senderAddress;

        invoices = database.getInvoicesWithFilters(filters);

        const filterDescriptions: string[] = [];
        if (tokenAddress) filterDescriptions.push(`token: ${tokenAddress}`);
        if (status) filterDescriptions.push(`status: ${status}`);
        if (senderAddress) filterDescriptions.push(`sender: ${senderAddress}`);

        message = `Retrieved ${invoices.length} invoice(s) filtered by ${filterDescriptions.join(', ')}`;
      } else {
        // If no parameters provided, return all invoices
        invoices = database.getAllInvoices();
        message = `Retrieved ${invoices.length} invoice(s)`;
      }

      const response: ApiResponse<any[]> = {
        success: true,
        message: message,
        data: serializeInvoices(invoices)
      };

      return new Response(
        JSON.stringify(response),
        {
          status: 200,
          headers: { "Content-Type": "application/json" }
        }
      );
    } catch (error) {
      console.error("Error retrieving invoice(s):", error);

      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to retrieve invoices"
      };

      return new Response(
        JSON.stringify(response),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  };

  /**
   * Handle PATCH /invoice/:id - Update an invoice (e.g., partial note hash)
   */
  const handleUpdateInvoice: RequestHandler = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/');
      const invoiceId = pathParts[pathParts.length - 1];

      if (!invoiceId) {
        return new Response(
          JSON.stringify({ success: false, error: "Invoice ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const updates = await req.json();
      
      // Get existing invoice
      const invoice = database.getInvoiceById(invoiceId);
      if (!invoice) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invoice #${invoiceId} not found` 
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Update allowed fields (currently only partialNoteHash)
      if (updates.partialNoteHash !== undefined) {
        invoice.partialNoteHash = updates.partialNoteHash;
      }

      // Save updated invoice
      const success = database.updateInvoice(invoiceId, invoice);
      
      if (success) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Invoice #${invoiceId} updated successfully`,
            data: serializeInvoice(invoice)
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Failed to update invoice #${invoiceId}` 
          }),
          { status: 500, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to update invoice"
      };

      return new Response(
        JSON.stringify(response),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  };

  /**
   * Handle POST /invoice/paid - Mark an invoice as paid
   * This can be called by event listener or manually
   */
  const handleMarkPaid: RequestHandler = async (req: Request): Promise<Response> => {
    try {
      const { invoiceId } = await req.json();
      
      if (!invoiceId) {
        return new Response(
          JSON.stringify({ success: false, error: "Invoice ID required" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      const success = database.markInvoicePaid(invoiceId);
      
      if (success) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: `Invoice #${invoiceId} marked as paid` 
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      } else {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: `Invoice #${invoiceId} not found` 
          }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }
    } catch (error) {
      const response: ApiResponse = {
        success: false,
        error: error instanceof Error ? error.message : "Failed to mark invoice as paid"
      };

      return new Response(
        JSON.stringify(response),
        {
          status: 500,
          headers: { "Content-Type": "application/json" }
        }
      );
    }
  };

  return {
    handleCreateInvoice,
    handleGetInvoice,
    handleUpdateInvoice,
    handleMarkPaid
  };
}

