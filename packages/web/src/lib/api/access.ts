import { API_URL } from "./client";
import type { AccessRequest, AccessLog } from "@/stores/useAccessStore";

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
}

interface AccessCheckResponse {
  hasAccess: boolean;
  reason: string;
}

/**
 * Check if user can access an invoice
 */
export const checkInvoiceAccess = async (
  invoiceId: string,
  userAddress: string
): Promise<AccessCheckResponse> => {
  const response = await fetch(
    `${API_URL}/invoice/${invoiceId}/can-access?user_address=${encodeURIComponent(userAddress)}`
  );

  if (!response.ok) {
    const errorData: ApiResponse = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to check access");
  }

  const result: ApiResponse<AccessCheckResponse> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to check access");
  }

  return result.data;
};

/**
 * Create a new access request
 */
export const createAccessRequest = async (params: {
  invoiceId: string;
  requesterAddress: string;
  requesterName?: string;
  requesterRole?: string;
  reason: string;
}): Promise<AccessRequest> => {
  console.log("API_URL:", API_URL);
  console.log("createAccessRequest params:", params);
  const response = await fetch(`${API_URL}/invoice/access-request`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const errorData: ApiResponse = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to create access request");
  }

  const result: ApiResponse<AccessRequest> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to create access request");
  }

  return result.data;
};

/**
 * Get access requests with filters
 */
export const getAccessRequests = async (filters: {
  invoiceId?: string;
  requester?: string;
  ownerAddress?: string;
}): Promise<AccessRequest[]> => {
  const params = new URLSearchParams();
  
  if (filters.invoiceId) params.append("invoice_id", filters.invoiceId);
  if (filters.requester) params.append("requester", filters.requester);
  if (filters.ownerAddress) params.append("owner_address", filters.ownerAddress);

  const response = await fetch(
    `${API_URL}/invoice/access-requests?${params.toString()}`
  );

  if (!response.ok) {
    const errorData: ApiResponse = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to get access requests");
  }

  const result: ApiResponse<AccessRequest[]> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to get access requests");
  }

  return result.data;
};

/**
 * Update access request (approve/deny)
 */
export const updateAccessRequest = async (
  requestId: string,
  update: {
    status: "approved" | "denied";
    responseReason?: string;
    expiresAt?: number;
  }
): Promise<AccessRequest> => {
  const response = await fetch(
    `${API_URL}/invoice/access-request/${requestId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    }
  );

  if (!response.ok) {
    const errorData: ApiResponse = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to update access request");
  }

  const result: ApiResponse<AccessRequest> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to update access request");
  }

  return result.data;
};

/**
 * Log access to an invoice
 */
export const logInvoiceAccess = async (
  invoiceId: string,
  accessorAddress: string,
  action: "view" | "download" | "export"
): Promise<void> => {
  const response = await fetch(`${API_URL}/invoice/${invoiceId}/log-access`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessorAddress, action }),
  });

  if (!response.ok) {
    const errorData: ApiResponse = await response.json().catch(() => ({}));
    console.error("Failed to log access:", errorData.error);
    // Don't throw - logging is non-critical
  }
};

/**
 * Get access logs for an invoice
 */
export const getAccessLogs = async (invoiceId: string): Promise<AccessLog[]> => {
  const response = await fetch(`${API_URL}/invoice/${invoiceId}/access-logs`);

  if (!response.ok) {
    const errorData: ApiResponse = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to get access logs");
  }

  const result: ApiResponse<AccessLog[]> = await response.json();
  
  if (!result.success || !result.data) {
    throw new Error(result.error || "Failed to get access logs");
  }

  return result.data;
};

