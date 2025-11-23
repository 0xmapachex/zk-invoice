import type { IDatabase } from "../db/interface";
import type { ApiResponse } from "../types/api";

/**
 * Create access control handlers with database dependency injection
 */
export const createAccessHandlers = (database: IDatabase) => {
  /**
   * Create new access request
   * POST /invoice/access-request
   */
  const handleCreateAccessRequest = async (req: Request): Promise<Response> => {
    try {
      const body = await req.json();
      const { invoiceId, requesterAddress, requesterName, requesterRole, reason } = body;

      // Validate required fields
      if (!invoiceId || !requesterAddress || !reason) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing required fields: invoiceId, requesterAddress, reason",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if invoice exists
      const invoice = database.getInvoiceById(invoiceId);
      if (!invoice) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invoice not found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if user is already the owner
      if (invoice.senderAddress === requesterAddress) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "You are the owner of this invoice. No access request needed.",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check for existing pending request
      const existingRequests = database.getAccessRequestsByInvoice(invoiceId);
      const pendingRequest = existingRequests.find(
        (req) => req.requester_address === requesterAddress && req.status === 'pending'
      );

      if (pendingRequest) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "You already have a pending access request for this invoice",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create access request
      const accessRequest = database.createAccessRequest({
        invoice_id: invoiceId,
        requester_address: requesterAddress,
        requester_name: requesterName,
        requester_role: requesterRole,
        reason,
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: accessRequest,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error creating access request:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to create access request",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Get access requests with filters
   * GET /invoice/access-requests?invoice_id=X&requester=Y&owner_address=Z
   */
  const handleGetAccessRequests = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const invoiceId = url.searchParams.get("invoice_id");
      const requesterAddress = url.searchParams.get("requester");
      const ownerAddress = url.searchParams.get("owner_address");

      let requests;

      if (invoiceId) {
        requests = database.getAccessRequestsByInvoice(invoiceId);
      } else if (requesterAddress) {
        requests = database.getAccessRequestsByRequester(requesterAddress);
      } else if (ownerAddress) {
        requests = database.getPendingAccessRequestsByOwner(ownerAddress);
      } else {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Must provide invoice_id, requester, or owner_address query parameter",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: requests,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error getting access requests:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to get access requests",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Approve or deny access request
   * PATCH /invoice/access-request/:id
   */
  const handleUpdateAccessRequest = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const requestId = pathParts[pathParts.length - 1];

      const body = await req.json();
      const { status, responseReason, expiresAt } = body;

      // Validate required fields
      if (!status || !['approved', 'denied'].includes(status)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid status. Must be 'approved' or 'denied'",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if request exists
      const accessRequest = database.getAccessRequestById(requestId);
      if (!accessRequest) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Access request not found",
          }),
          {
            status: 404,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if already responded
      if (accessRequest.status !== 'pending') {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Access request has already been responded to",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Update access request
      const updated = database.updateAccessRequest(requestId, {
        status,
        response_reason: responseReason,
        expires_at: expiresAt,
      });

      if (!updated) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to update access request",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: database.getAccessRequestById(requestId),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error updating access request:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to update access request",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Check if user can access invoice
   * GET /invoice/:id/can-access?user_address=X
   */
  const handleCanAccess = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const invoiceId = pathParts[1]; // invoice/:id/can-access
      const userAddress = url.searchParams.get("user_address");

      if (!userAddress) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing user_address query parameter",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if invoice exists
      const invoice = database.getInvoiceById(invoiceId);
      if (!invoice) {
        // Return success: true with hasAccess: false so frontend handles it gracefully
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              hasAccess: false,
              reason: "Invoice not found",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if user is the owner
      if (invoice.senderAddress === userAddress) {
        return new Response(
          JSON.stringify({
            success: true,
            data: {
              hasAccess: true,
              reason: "You are the owner",
            },
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Check if user has approved access
      const hasAccess = database.hasValidAccess(invoiceId, userAddress);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            hasAccess,
            reason: hasAccess ? "Access granted" : "Access denied. Request access to view this invoice.",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error checking access:", error);
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            hasAccess: false,
            reason: error.message || "Failed to check access",
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Log access to invoice
   * POST /invoice/:id/log-access
   */
  const handleLogAccess = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const invoiceId = pathParts[1]; // invoice/:id/log-access

      const body = await req.json();
      const { accessorAddress, action } = body;

      // Validate required fields
      if (!accessorAddress || !action) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing required fields: accessorAddress, action",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Validate action
      if (!['view', 'download', 'export'].includes(action)) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Invalid action. Must be 'view', 'download', or 'export'",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Create access log
      const accessLog = database.createAccessLog({
        invoice_id: invoiceId,
        accessor_address: accessorAddress,
        action,
      });

      return new Response(
        JSON.stringify({
          success: true,
          data: accessLog,
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error logging access:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to log access",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  /**
   * Get access logs for invoice
   * GET /invoice/:id/access-logs
   */
  const handleGetAccessLogs = async (req: Request): Promise<Response> => {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split("/").filter(Boolean);
      const invoiceId = pathParts[1]; // invoice/:id/access-logs

      const logs = database.getAccessLogsByInvoice(invoiceId);

      return new Response(
        JSON.stringify({
          success: true,
          data: logs,
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    } catch (error: any) {
      console.error("Error getting access logs:", error);
      return new Response(
        JSON.stringify({
          success: false,
          error: error.message || "Failed to get access logs",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  };

  return {
    handleCreateAccessRequest,
    handleGetAccessRequests,
    handleUpdateAccessRequest,
    handleCanAccess,
    handleLogAccess,
    handleGetAccessLogs,
  };
};

